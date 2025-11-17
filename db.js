/* db.js
   localStorage DB module.
   Schema (in localStorage under key 'quiz_db_v1'):
   {
     subjects: [{id, name, description}],
     topics: [{id, subjectId, name, description}],
     questions: [{id, topicId, subjectId, text, choices:[{id,text}], answerIds:[id,...], imageUrl, tags:[], difficulty}],
     history: [{id, timestamp, title, meta: {...}, results: {...}}],
     admin: {user:'admin', pwHash: '...' } // simple base64 stored password
   }
*/

(function(global){
  const STORAGE_KEY = 'quiz_db_v1';

  function uid(prefix='id'){
    return prefix + '_' + Math.random().toString(36).slice(2,9);
  }

  // default seed data (owner may edit directly)
  const SEED_DATA = {
    subjects: [
      { id: 's_general', name: 'General Knowledge', description: 'Mixed GK' },
      { id: 's_math', name: 'Mathematics', description: 'Math problems & quizzes' }
    ],
    topics: [
      { id: 't_gk_1', subjectId: 's_general', name: 'World Facts', description: '' },
      { id: 't_math_1', subjectId: 's_math', name: 'Algebra Basics', description: '' }
    ],
    questions: [
      {
        id: 'q1',
        topicId: 't_gk_1',
        subjectId: 's_general',
        text: 'Which is the largest ocean on Earth?',
        choices: [
          { id: 'c1', text: 'Atlantic' },
          { id: 'c2', text: 'Indian' },
          { id: 'c3', text: 'Pacific' },
          { id: 'c4', text: 'Arctic' }
        ],
        answerIds: ['c3'],
        imageUrl: '',
        tags: ['geography'],
        difficulty: 'easy'
      },
      {
        id: 'q2',
        topicId: 't_math_1',
        subjectId: 's_math',
        text: 'Solve: 2x + 3 = 11. What is x?',
        choices: [
          { id: 'c1', text: '4' },
          { id: 'c2', text: '3' },
          { id: 'c3', text: '5' },
          { id: 'c4', text: '6' }
        ],
        answerIds: ['c1'],
        imageUrl: '',
        tags: ['algebra'],
        difficulty: 'easy'
      }
    ],
    history: [],
    admin: {
      user: 'admin',
      // default password "admin" but base64 encoded; you may change.
      pwHash: btoa('admin')
    }
  };

  // load or init
  function load(){
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
    try {
      return JSON.parse(raw);
    } catch(e){
      console.error('Corrupt DB — resetting', e);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
      return JSON.parse(JSON.stringify(SEED_DATA));
    }
  }

  function save(db){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  // Public API
  const DB = {
    _db: load(),

    getSubjects(){
      return [...DB._db.subjects];
    },
    getTopics(subjectId){
      if(!subjectId) return [...DB._db.topics];
      return DB._db.topics.filter(t => t.subjectId === subjectId);
    },
    getQuestions({subjectId, topicId} = {}){
      let q = DB._db.questions;
      if(subjectId) q = q.filter(x => x.subjectId === subjectId);
      if(topicId) q = q.filter(x => x.topicId === topicId);
      return q.map(clone);
    },
    getQuestionById(id){
      return clone(DB._db.questions.find(x => x.id === id));
    },
    addSubject(s){
      s.id = s.id || uid('s');
      DB._db.subjects.push(s);
      save(DB._db);
      return s;
    },
    updateSubject(id, patch){
      const idx = DB._db.subjects.findIndex(s=>s.id===id);
      if(idx>=0) Object.assign(DB._db.subjects[idx], patch), save(DB._db), true;
      return DB._db.subjects[idx];
    },
    removeSubject(id){
      DB._db.subjects = DB._db.subjects.filter(s=>s.id!==id);
      DB._db.topics = DB._db.topics.filter(t=>t.subjectId!==id);
      DB._db.questions = DB._db.questions.filter(q=>q.subjectId!==id);
      save(DB._db);
    },
    addTopic(t){
      t.id = t.id || uid('t');
      DB._db.topics.push(t);
      save(DB._db);
      return t;
    },
    updateTopic(id, patch){
      const idx = DB._db.topics.findIndex(s=>s.id===id);
      if(idx>=0) Object.assign(DB._db.topics[idx], patch), save(DB._db), true;
      return DB._db.topics[idx];
    },
    removeTopic(id){
      DB._db.topics = DB._db.topics.filter(t=>t.id!==id);
      DB._db.questions = DB._db.questions.filter(q=>q.topicId!==id);
      save(DB._db);
    },
    addQuestion(q){
      q.id = q.id || uid('q');
      DB._db.questions.push(q);
      save(DB._db);
      return q;
    },
    updateQuestion(id, patch){
      const idx = DB._db.questions.findIndex(s=>s.id===id);
      if(idx>=0) Object.assign(DB._db.questions[idx], patch), save(DB._db), true;
      return DB._db.questions[idx];
    },
    removeQuestion(id){
      DB._db.questions = DB._db.questions.filter(q=>q.id!==id);
      save(DB._db);
    },
    pushHistory(entry){
      entry.id = uid('h'); entry.timestamp = new Date().toISOString();
      DB._db.history.unshift(entry);
      // keep last 200
      DB._db.history = DB._db.history.slice(0,200);
      save(DB._db);
      return entry;
    },
    getHistory(){
      return [...DB._db.history];
    },
    adminLogin(user, pw){
      return user === DB._db.admin.user && btoa(pw) === DB._db.admin.pwHash;
    },
    setAdminPassword(newPw){
      DB._db.admin.pwHash = btoa(newPw);
      save(DB._db);
    },
    exportJSON(){
      return JSON.stringify(DB._db, null, 2);
    },
    importJSON(jsonStr){
      try{
        const parsed = JSON.parse(jsonStr);
        // basic validation
        if(!parsed.subjects || !parsed.topics || !parsed.questions) throw new Error('Invalid structure');
        DB._db = parsed;
        save(DB._db);
        return true;
      }catch(e){
        console.error(e);
        return false;
      }
    },
    exportCSV(){
      // produce a CSV of questions for portability
      const rows = [['id','subjectId','topicId','text','choices','answerIds','imageUrl','tags','difficulty']];
      DB._db.questions.forEach(q=>{
        rows.push([
          q.id,
          q.subjectId,
          q.topicId,
          `"${q.text.replace(/"/g,'""')}"`,
          `"${q.choices.map(c=>c.text).join('|||').replace(/"/g,'""')}"`,
          `"${q.answerIds.join('|')}"`,
          `"${q.imageUrl||''}"`,
          `"${(q.tags||[]).join('|')}"`,
          q.difficulty || ''
        ]);
      });
      return rows.map(r=>r.join(',')).join('\n');
    },
    importCSV(csvText){
      const lines = csvText.split(/\r?\n/).filter(Boolean);
      const header = lines.shift().split(',');
      // naive parse for the format we export
      lines.forEach(line=>{
        // split by commas but handle quoted text - simple parser:
        const parts = parseCSVLine(line);
        const [id, subjectId, topicId, text, choices, answerIds, imageUrl, tags, difficulty] = parts;
        const q = {
          id: id || uid('q'),
          subjectId,
          topicId,
          text: (text||'').replace(/^"|"$/g,'').replace(/""/g,'"'),
          choices: (choices||'').replace(/^"|"$/g,'').split('|||').map((t,i)=>({ id: uid('c'), text: t })),
          answerIds: (answerIds||'').replace(/^"|"$/g,'').split('|').filter(Boolean),
          imageUrl: (imageUrl||'').replace(/^"|"$/g,''),
          tags: (tags||'').replace(/^"|"$/g,'').split('|').filter(Boolean),
          difficulty: difficulty || ''
        };
        DB._db.questions.push(q);
      });
      save(DB._db);
    }
  };

  // small helpers
  function clone(x){ return JSON.parse(JSON.stringify(x)); }

  function parseCSVLine(line){
    const result = [];
    let cur = '', inQuote=false;
    for(let i=0;i<line.length;i++){
      const ch = line[i];
      if(ch === '"' && line[i+1]==='"'){ cur += '"'; i++; continue; }
      if(ch === '"'){ inQuote = !inQuote; continue; }
      if(ch === ',' && !inQuote){ result.push(cur); cur=''; continue; }
      cur += ch;
    }
    result.push(cur);
    return result;
  }

  // expose
  global.DB = DB;

})(window);
