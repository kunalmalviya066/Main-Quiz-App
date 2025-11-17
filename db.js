/* db.js
   Lightweight localStorage DB wrapper for QuizLab.
   Exposes QA_DB namespace with methods to read/write subjects, topics, questions, and history.
*/

(function(global){
  const STORE_KEY = 'quizlab_db_v1';
  const HISTORY_KEY = 'quizlab_history_v1';

  const defaultData = {
    subjects: [
      { id: 'sub_math', name: 'Mathematics', desc: 'Numbers, algebra, geometry' },
      { id: 'sub_phy', name: 'Physics', desc: 'Mechanics, electricity' },
      { id: 'sub_gen', name: 'General Knowledge', desc: 'Current affairs & facts' }
    ],
    topics: [
      { id: 't_algebra', subjectId: 'sub_math', name: 'Algebra' },
      { id: 't_geom', subjectId: 'sub_math', name: 'Geometry' },
      { id: 't_mech', subjectId: 'sub_phy', name: 'Mechanics' },
      { id: 't_elec', subjectId: 'sub_phy', name: 'Electrodynamics' },
      { id: 't_gk', subjectId: 'sub_gen', name: 'World Facts' }
    ],
    questions: [
      {
        id: 'q1',
        subjectId: 'sub_math',
        topicId: 't_algebra',
        text: 'If 3x + 2 = 11, what is x?',
        choices: ['1', '2', '3', '4'],
        answer: 2, // zero-based index -> '3'
        image: null,
        meta: {}
      },
      {
        id: 'q2',
        subjectId: 'sub_math',
        topicId: 't_geom',
        text: 'What is the area of a circle with radius 2?',
        choices: ['4π', '2π', 'π', '8π'],
        answer: 0,
        image: null,
        meta: {}
      },
      {
        id: 'q3',
        subjectId: 'sub_phy',
        topicId: 't_mech',
        text: 'An object in free fall near Earth accelerates at about:',
        choices: ['9.8 m/s²', '10 km/h²', '9.8 km/s²', '0.98 m/s²'],
        answer: 0,
        image: null,
        meta: {}
      },
      {
        id: 'q4',
        subjectId: 'sub_gen',
        topicId: 't_gk',
        text: 'Which is the largest ocean on Earth?',
        choices: ['Indian Ocean', 'Pacific Ocean', 'Atlantic Ocean', 'Arctic Ocean'],
        answer: 1,
        image: null,
        meta: {}
      },
      {
        id: 'q5',
        subjectId: 'sub_phy',
        topicId: 't_elec',
        text: 'Identify the component shown in the image (resistor):',
        choices: ['Resistor', 'Capacitor', 'Inductor', 'Diode'],
        answer: 0,
        image: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><rect width="200" height="40" fill="%23fff"/><text x="10" y="25" font-family="Arial" font-size="16" fill="%23000">RESISTOR</text></svg>',
        meta: {}
      }
    ],
    settings: {
      adminPasswordHash: sha256('admin123'), // initial admin password (hashed)
      adminLock: { attempts: 0, lockedUntil: null }
    }
  };

  // Simple SHA-256 hash helper (sync, uses SubtleCrypto when available)
  function sha256(str){
    if(typeof crypto !== 'undefined' && crypto.subtle){
      // Subtle returns promise => keep simple synchronous fallback string if unavailable in older browsers
      // We'll use a simple JS fallback (not cryptographically secure) for hashing in this demo
      // But attempt to use subtle if available (async) — since we need synchronous here, use fallback.
    }
    // fallback: simple hash-like string (NOT cryptographically secure) but sufficient for local validation
    let h = 2166136261 >>> 0;
    for(let i=0;i<str.length;i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return 'h'+h.toString(16);
  }

  function load(){
    const raw = localStorage.getItem(STORE_KEY);
    if(!raw) {
      localStorage.setItem(STORE_KEY, JSON.stringify(defaultData));
      return JSON.parse(JSON.stringify(defaultData));
    }
    try{
      return JSON.parse(raw);
    }catch(e){
      console.error('Failed to parse DB; resetting.',e);
      localStorage.setItem(STORE_KEY, JSON.stringify(defaultData));
      return JSON.parse(JSON.stringify(defaultData));
    }
  }

  function save(db){
    localStorage.setItem(STORE_KEY, JSON.stringify(db));
  }

  const QA_DB = {
    _db: load(),

    // Subjects
    getSubjects(){
      return QA_DB._db.subjects.slice();
    },
    findSubject(id){ return QA_DB._db.subjects.find(s=>s.id===id) || null; },

    // Topics
    getTopics(filter = {}) {
      let t = QA_DB._db.topics.slice();
      if(filter.subjectId) t = t.filter(x=>x.subjectId===filter.subjectId);
      return t;
    },

    // Questions
    getQuestions({subjectIds=null, topicIds=null} = {}){
      let q = QA_DB._db.questions.slice();
      if(subjectIds && subjectIds.length) q = q.filter(x=>subjectIds.includes(x.subjectId));
      if(topicIds && topicIds.length) q = q.filter(x=>topicIds.includes(x.topicId));
      return q;
    },

    addQuestion(question){
      question.id = question.id || 'q' + Date.now();
      QA_DB._db.questions.push(question);
      save(QA_DB._db);
      return question;
    },

    // history
    saveAttempt(record){
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(record);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    },
    getHistory(){
      const raw = localStorage.getItem(HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    },

    // settings
    verifyAdmin(password){
      const hash = sha256(password);
      return QA_DB._db.settings.adminPasswordHash === hash;
    },
    changeAdminPassword(oldPass, newPass){
      if(QA_DB.verifyAdmin(oldPass)){
        QA_DB._db.settings.adminPasswordHash = sha256(newPass);
        save(QA_DB._db);
        return true;
      }
      return false;
    },

    // export/import
    exportJSON(){
      return JSON.stringify(QA_DB._db, null, 2);
    },
    importJSON(jsonStr){
      try{
        const parsed = JSON.parse(jsonStr);
        // basic validation
        if(!parsed.subjects || !parsed.questions) throw new Error('Invalid format');
        QA_DB._db = parsed;
        save(QA_DB._db);
        return true;
      }catch(e){
        console.error(e);
        return false;
      }
    },

    // For later admin.js use
    _save(){
      save(QA_DB._db);
    },

    // utility: simple shuffle
    shuffleArray(arr){
      for(let i = arr.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
  };

  // Expose globally
  global.QA_DB = QA_DB;

})(window);
