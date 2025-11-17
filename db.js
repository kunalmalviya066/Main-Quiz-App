/* db.js - localStorage wrapper + sample data */
(function(global){
  const LS_PREFIX = 'pq_';
  const KEYS = {
    meta: LS_PREFIX + 'meta',
    subjects: LS_PREFIX + 'subjects',
    topics: LS_PREFIX + 'topics',
    questions: LS_PREFIX + 'questions',
    history: LS_PREFIX + 'history'
  };

  const DB = {};

  // initialize with sample data if empty
  DB.init = function(){
    if (!localStorage.getItem(KEYS.meta)){
      const now = Date.now();
      localStorage.setItem(KEYS.meta, JSON.stringify({version:1, createdAt: now, lastDailySeedDate: null, dailySeed: null}));
    }
    if (!localStorage.getItem(KEYS.subjects)){
      const subs = [
        {id:'sub_math', name:'Mathematics', description:'Numbers, algebra & geometry'},
        {id:'sub_phy', name:'Physics', description:'Mechanics, waves, optics'},
        {id:'sub_chem', name:'Chemistry', description:'Atoms and reactions'}
      ];
      localStorage.setItem(KEYS.subjects, JSON.stringify(subs));
    }
    if (!localStorage.getItem(KEYS.topics)){
      const tops = [
        {id:'top_algebra', subjectId:'sub_math', name:'Algebra'},
        {id:'top_geom', subjectId:'sub_math', name:'Geometry'},
        {id:'top_mech', subjectId:'sub_phy', name:'Mechanics'},
        {id:'top_opt', subjectId:'sub_phy', name:'Optics'},
        {id:'top_org', subjectId:'sub_chem', name:'Organic'}
      ];
      localStorage.setItem(KEYS.topics, JSON.stringify(tops));
    }
    if (!localStorage.getItem(KEYS.questions)){
      const qs = [
        {
          id:'q1',
          subjectId:'sub_math',
          topicId:'top_algebra',
          question:'What is 2 + 2?',
          choices:['1','2','3','4'],
          correctIndex:3,
          explanation:'Basic addition.',
          image: null,
          createdAt: Date.now()
        },
        {
          id:'q2',
          subjectId:'sub_math',
          topicId:'top_geom',
          question:'How many degrees are in a straight line?',
          choices:['90','180','270','360'],
          correctIndex:1,
          explanation:'A straight line is 180°.',
          image: null,
          createdAt: Date.now()
        },
        {
          id:'q3',
          subjectId:'sub_phy',
          topicId:'top_mech',
          question:'Newton\'s second law relates force to?',
          choices:['Velocity','Acceleration','Momentum','Energy'],
          correctIndex:1,
          explanation:'F = ma.',
          image: null,
          createdAt: Date.now()
        },
        {
          id:'q4',
          subjectId:'sub_chem',
          topicId:'top_org',
          question:'Which element is central to organic chemistry?',
          choices:['Oxygen','Carbon','Hydrogen','Nitrogen'],
          correctIndex:1,
          explanation:'Carbon forms the backbone of organic molecules.',
          image: null,
          createdAt: Date.now()
        },
        {
          id:'q5',
          subjectId:'sub_phy',
          topicId:'top_opt',
          question:'Light refracts when it passes from air into?',
          choices:['Vacuum','Another medium','Gravity','Sound'],
          correctIndex:1,
          explanation:'Change in medium changes speed leading to refraction.',
          image: null,
          createdAt: Date.now()
        }
      ];
      localStorage.setItem(KEYS.questions, JSON.stringify(qs));
    }
    if (!localStorage.getItem(KEYS.history)){
      localStorage.setItem(KEYS.history, JSON.stringify([]));
    }
  };

  DB.getMeta = function(){ return JSON.parse(localStorage.getItem(KEYS.meta) || '{}')};
  DB.setMeta = function(m){ localStorage.setItem(KEYS.meta, JSON.stringify(m)); };

  DB.getSubjects = function(){ return JSON.parse(localStorage.getItem(KEYS.subjects) || '[]') };
  DB.getTopics = function(){ return JSON.parse(localStorage.getItem(KEYS.topics) || '[]') };
  DB.getQuestions = function(){ return JSON.parse(localStorage.getItem(KEYS.questions) || '[]') };
  DB.getHistory = function(){ return JSON.parse(localStorage.getItem(KEYS.history) || '[]') };

  DB.addSubject = function(obj){
    const a = DB.getSubjects(); a.push(obj); localStorage.setItem(KEYS.subjects, JSON.stringify(a)); return obj;
  };
  DB.addTopic = function(obj){
    const a = DB.getTopics(); a.push(obj); localStorage.setItem(KEYS.topics, JSON.stringify(a)); return obj;
  };
  DB.addQuestion = function(q){
    const a = DB.getQuestions(); a.push(q); localStorage.setItem(KEYS.questions, JSON.stringify(a)); return q;
  };

  DB.findTopicsBySubjects = function(subjectIds){
    const tops = DB.getTopics().filter(t => subjectIds.includes(t.subjectId));
    return tops;
  };

  DB.questionsByFilter = function({subjectIds=[], topicIds=[]}){
    const all = DB.getQuestions();
    return all.filter(q => (subjectIds.length? subjectIds.includes(q.subjectId): true) && (topicIds.length? topicIds.includes(q.topicId): true));
  };

  DB.getDailyQuiz = function(count=10){
    const meta = DB.getMeta();
    const today = (new Date()).toISOString().slice(0,10);
    if (meta.lastDailySeedDate !== today){
      meta.lastDailySeedDate = today;
      meta.dailySeed = utils.uid('seed') + Date.now();
      DB.setMeta(meta);
    }
    // use seed to pick deterministic daily quiz for this browser
    const seedNum = Array.from(meta.dailySeed).reduce((s,ch)=> s + ch.charCodeAt(0), 0);
    const rnd = utils.seededRng(seedNum);
    const allQs = DB.getQuestions();
    const shuffled = utils.shuffle(allQs, rnd);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  };

  DB.saveAttempt = function(attempt){
    const h = DB.getHistory();
    h.unshift(attempt); // latest first
    localStorage.setItem(KEYS.history, JSON.stringify(h));
  };

  DB.clearHistory = function(){
    localStorage.setItem(KEYS.history, JSON.stringify([]));
  };

  DB.exportAll = function(){
    return {
      meta: DB.getMeta(),
      subjects: DB.getSubjects(),
      topics: DB.getTopics(),
      questions: DB.getQuestions(),
      history: DB.getHistory()
    };
  };

  DB.importAll = function(obj){
    if (obj.meta) localStorage.setItem(KEYS.meta, JSON.stringify(obj.meta));
    if (obj.subjects) localStorage.setItem(KEYS.subjects, JSON.stringify(obj.subjects));
    if (obj.topics) localStorage.setItem(KEYS.topics, JSON.stringify(obj.topics));
    if (obj.questions) localStorage.setItem(KEYS.questions, JSON.stringify(obj.questions));
    if (obj.history) localStorage.setItem(KEYS.history, JSON.stringify(obj.history));
  };

  // expose
  global.DB = DB;

  // init immediately
  DB.init();
})(window);
