// db.js
// ES module providing localStorage-backed DB functions.

const DB_KEY = 'quizlab_db_v1';

const DEFAULT_DB = {
  subjects: [
    { id: 'sub-1', name: 'General Knowledge', createdAt: Date.now() },
    { id: 'sub-2', name: 'Mathematics', createdAt: Date.now() }
  ],
  topics: [
    { id: 'top-1', subjectId: 'sub-1', name: 'History' },
    { id: 'top-2', subjectId: 'sub-1', name: 'Science' },
    { id: 'top-3', subjectId: 'sub-2', name: 'Algebra' }
  ],
  questions: [
    {
      id: 'q-1',
      subjectId: 'sub-1',
      topicId: 'top-1',
      text: 'Who was the first person to walk on the Moon?',
      choices: ['Yuri Gagarin','Neil Armstrong','Buzz Aldrin','Michael Collins'],
      answerIndex: 1,
      image: '',
      createdAt: Date.now()
    },
    {
      id: 'q-2',
      subjectId: 'sub-2',
      topicId: 'top-3',
      text: 'Solve: 2x + 3 = 11',
      choices: ['3','4','5','6'],
      answerIndex: 1,
      image: '',
      createdAt: Date.now()
    }
  ],
  users: [
    // user test history entries
  ],
  admin: {
    username: 'admin',
    // default password: 'admin' (hashed simply)
    passwordHash: btoa('admin') // simple base64 for demo; replace later
  }
};

function readRaw(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(!raw){
      localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB));
      return JSON.parse(JSON.stringify(DEFAULT_DB));
    }
    return JSON.parse(raw);
  }catch(e){
    console.error('DB read error', e);
    localStorage.setItem(DB_KEY, JSON.stringify(DEFAULT_DB));
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function write(db){
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  return true;
}

export function getDB(){
  return readRaw();
}

export function saveDB(updated){
  write(updated);
}

/* Subjects */
export function listSubjects(){
  return readRaw().subjects.slice();
}
export function addSubject(name){
  const db = readRaw();
  const id = 'sub-' + Date.now();
  db.subjects.push({ id, name, createdAt: Date.now() });
  write(db);
  return id;
}
export function updateSubject(id, name){
  const db = readRaw();
  const s = db.subjects.find(x => x.id === id);
  if(s) s.name = name;
  write(db);
}
export function deleteSubject(id){
  const db = readRaw();
  db.subjects = db.subjects.filter(s=>s.id!==id);
  db.topics = db.topics.filter(t=>t.subjectId!==id);
  db.questions = db.questions.filter(q=>q.subjectId!==id);
  write(db);
}

/* Topics */
export function listTopics(subjectId){
  const db = readRaw();
  return subjectId ? db.topics.filter(t=>t.subjectId===subjectId) : db.topics.slice();
}
export function addTopic(subjectId, name){
  const db = readRaw();
  const id = 'top-' + Date.now();
  db.topics.push({ id, subjectId, name });
  write(db);
  return id;
}
export function updateTopic(id, name){
  const db = readRaw();
  const t = db.topics.find(x=>x.id===id);
  if(t) t.name = name;
  write(db);
}
export function deleteTopic(id){
  const db = readRaw();
  db.topics = db.topics.filter(t=>t.id!==id);
  db.questions = db.questions.filter(q=>q.topicId!==id);
  write(db);
}

/* Questions */
export function listQuestions({subjectId=null, topicId=null} = {}){
  const db = readRaw();
  let qs = db.questions.slice();
  if(subjectId) qs = qs.filter(q=>q.subjectId===subjectId);
  if(topicId) qs = qs.filter(q=>q.topicId===topicId);
  return qs;
}
export function getQuestion(id){
  const db = readRaw();
  return db.questions.find(q=>q.id===id) || null;
}
export function addQuestion(q){
  const db = readRaw();
  const id = 'q-' + Date.now();
  const question = Object.assign({}, q, { id, createdAt: Date.now() });
  db.questions.push(question);
  write(db);
  return id;
}
export function updateQuestion(id, patch){
  const db = readRaw();
  const q = db.questions.find(x=>x.id===id);
  if(!q) return false;
  Object.assign(q, patch);
  write(db);
  return true;
}
export function deleteQuestion(id){
  const db = readRaw();
  db.questions = db.questions.filter(q=>q.id!==id);
  write(db);
}

/* Users / history */
export function saveUserResult(result){
  const db = readRaw();
  db.users = db.users || [];
  db.users.push(result);
  write(db);
}

/* Import / Export */
export function exportJSON(){
  const db = readRaw();
  return JSON.stringify(db, null, 2);
}
export function importJSON(jsonString){
  try{
    const parsed = JSON.parse(jsonString);
    // naive validation
    if(!parsed.subjects || !parsed.questions) throw new Error('Invalid DB');
    localStorage.setItem(DB_KEY, JSON.stringify(parsed));
    return true;
  }catch(e){
    console.error('Import failed', e);
    return false;
  }
}

/* Simple CSV helpers (basic) */
export function exportQuestionsCSV(){
  const db = readRaw();
  const rows = [['id','subject','topic','text','choices','answerIndex','image']];
  db.questions.forEach(q=>{
    const subj = (db.subjects.find(s=>s.id===q.subjectId)||{}).name || '';
    const topic = (db.topics.find(t=>t.id===q.topicId)||{}).name || '';
    rows.push([
      q.id,
      subj,
      topic,
      q.text.replace(/\n/g,'\\n'),
      JSON.stringify(q.choices).replace(/"/g,'""'),
      q.answerIndex,
      q.image ? q.image : ''
    ]);
  });
  return rows.map(r=>r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
}
