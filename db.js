// Fixed DB.js with correct LS_KEY and proper init/cache handling

(function (global) {
  'use strict';

  const LS_KEY = 'quiz_db';
  const DEFAULT_ADMIN_USERNAME = 'admin';
  const DEFAULT_ADMIN_PASSWORD = 'admin123';

  const OWNER_SEED = {
    meta: { version: '1.0', createdAt: Date.now() },
    settings: {
      adminUsername: DEFAULT_ADMIN_USERNAME,
      lockout: { attempts: 0, lockedUntil: null }
    },
    subjects: [
      { id: 'sub_math', name: 'Mathematics', createdAt: Date.now() },
      { id: 'sub_phy', name: 'Physics', createdAt: Date.now() },
      { id: 'sub_gen', name: 'General Knowledge', createdAt: Date.now() }
    ],
    topics: [
      { id: 'top_alg', subjectId: 'sub_math', name: 'Algebra', createdAt: Date.now() },
      { id: 'top_geo', subjectId: 'sub_math', name: 'Geometry', createdAt: Date.now() },
      { id: 'top_mech', subjectId: 'sub_phy', name: 'Mechanics', createdAt: Date.now() },
      { id: 'top_wld', subjectId: 'sub_gen', name: 'World Facts', createdAt: Date.now() }
    ],
    questions: [
      {
        id: 'q_math_1', subjectId: 'sub_math', topicId: 'top_alg',
        question: 'What is 2 + 2?', choices: ['1','2','3','4'], answerIndex: 3,
        explanation: 'Basic addition: 2 + 2 = 4.', image: null, createdAt: Date.now()
      },
      {
        id: 'q_math_2', subjectId: 'sub_math', topicId: 'top_geo',
        question: 'What is the sum of interior angles of a triangle?',
        choices: ['180°','90°','360°','270°'], answerIndex: 0,
        explanation: 'Sum of interior angles = 180°.', image: null, createdAt: Date.now()
      },
      {
        id: 'q_phy_1', subjectId: 'sub_phy', topicId: 'top_mech',
        question: 'Which law explains inertia?',
        choices: ["Newton's First Law","Newton's Second Law","Law of Gravitation","Hooke's Law"], answerIndex: 0,
        explanation: "Newton's First Law", image: null, createdAt: Date.now()
      },
      {
        id: 'q_gen_1', subjectId: 'sub_gen', topicId: 'top_wld',
        question: 'Who wrote "Hamlet"?',
        choices: ['Charles Dickens','William Shakespeare','Leo Tolstoy','Mark Twain'], answerIndex: 1,
        explanation: 'Shakespeare wrote Hamlet.', image: null, createdAt: Date.now()
      }
    ],
    userHistory: [],
    dailySeed: { date: null, questionIds: [] }
  };

  function uid(prefix='') { return prefix + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }
  function now(){ return Date.now(); }
  function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

  async function sha256(text){
    const data = new TextEncoder().encode(text);
    const hashBuf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function readRaw(){
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || null; }
    catch(e){ return null; }
  }
  function writeRaw(obj){
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
    window.dispatchEvent(new CustomEvent('quiz_db_updated', {detail:{ts:Date.now()}}));
  }

  async function ensureInitialized(){
    let db = readRaw();
    if (!db){
      db = deepClone(OWNER_SEED);
      const pwdHash = await sha256(DEFAULT_ADMIN_PASSWORD);
      db.settings.adminPasswordHash = pwdHash;
      writeRaw(db);
    }
    return db;
  }

  const API = {
    _dbCache: null,

    init: async function(){
      const db = await ensureInitialized();
      this._dbCache = deepClone(db);
      return this._dbCache;
    },

    getDB: function(){
      if (this._dbCache) return deepClone(this._dbCache);
      const db = readRaw();
      this._dbCache = deepClone(db);
      return this._dbCache;
    },

    saveDB: function(dbObj){
      const save = deepClone(dbObj);
      save.meta = save.meta || {}; save.meta.updatedAt = now();
      writeRaw(save);
      this._dbCache = deepClone(save);
    },

    getSettings(){ return this.getDB().settings; },

    async verifyAdminPassword(plain){ return (await sha256(plain)) === this.getDB().settings.adminPasswordHash; },

    async setAdminPassword(curr,newP){
      if (!(await this.verifyAdminPassword(curr))) throw new Error('Current password incorrect');
      const db = this.getDB();
      db.settings.adminPasswordHash = await sha256(newP);
      this.saveDB(db);
    },

    registerFailedLoginAttempt(){ const db=this.getDB(); db.settings.lockout.attempts++; if(db.settings.lockout.attempts>=3){ db.settings.lockout.lockedUntil=now()+600000; db.settings.lockout.attempts=0;} this.saveDB(db); },
    resetLockout(){ const db=this.getDB(); db.settings.lockout={attempts:0,lockedUntil:null}; this.saveDB(db); },
    isLockedOut(){ const lu=this.getDB().settings.lockout.lockedUntil; if(!lu) return false; if(now()>lu){ this.resetLockout(); return false;} return true; },

    listSubjects(){ return this.getDB().subjects || []; },
    addSubject(name){ const db=this.getDB(); const s={id:uid('sub_'),name,createdAt:now()}; db.subjects.push(s); this.saveDB(db); return s; },
    updateSubject(id,name){ const db=this.getDB(); const s=db.subjects.find(x=>x.id===id); if(!s) throw 'Not found'; s.name=name; this.saveDB(db); },
    deleteSubject(id){ const db=this.getDB(); db.subjects=db.subjects.filter(s=>s.id!==id); db.topics=db.topics.filter(t=>t.subjectId!==id); db.questions=db.questions.filter(q=>q.subjectId!==id); this.saveDB(db); },

    listTopics(subId){ const t=this.getDB().topics; return subId? t.filter(x=>x.subjectId===subId):t; },
    addTopic(sid,name){ const db=this.getDB(); const t={id:uid('top_'),subjectId:sid,name,createdAt:now()}; db.topics.push(t); this.saveDB(db); },

    listQuestions(filters={}){
      let q=this.getDB().questions;
      if(filters.subjectId) q=q.filter(x=>x.subjectId===filters.subjectId);
      if(filters.topicId) q=q.filter(x=>x.topicId===filters.topicId);
      if(filters.ids) q=q.filter(x=>filters.ids.includes(x.id));
      return q;
    },

    addQuestion(p){ const db=this.getDB(); const q={id:uid('q_'),createdAt:now(),...p}; db.questions.push(q); this.saveDB(db); },
    updateQuestion(id,p){ const db=this.getDB(); Object.assign(db.questions.find(q=>q.id===id),p); this.saveDB(db); },
    deleteQuestion(id){ const db=this.getDB(); db.questions=db.questions.filter(q=>q.id!==id); this.saveDB(db); },

    recordUserHistory(h){ const db=this.getDB(); db.userHistory.push({id:uid('hist_'),timestamp:now(),...h}); this.saveDB(db); },
    listUserHistory(){ return this.getDB().userHistory; },

    generateDailySeedIfNeeded(n=10){
      const db=this.getDB(); const today=new Date().toISOString().slice(0,10);
      if(db.dailySeed.date===today && db.dailySeed.questionIds.length===n) return db.dailySeed;
      const ids=[...db.questions].sort(()=>Math.random()-0.5).slice(0,n).map(q=>q.id);
      db.dailySeed={date:today,questionIds:ids}; this.saveDB(db); return db.dailySeed;
    },
    getDailyQuestions(n=10){ return this.listQuestions({ids:this.generateDailySeedIfNeeded(n).questionIds}); }
  };

  global.DB = API;
})(window);
