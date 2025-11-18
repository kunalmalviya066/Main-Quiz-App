/* Main script for MockQuiz app
   Implements: routing, quiz creation (subject/topic/daily/fullmock), quiz engine,
   timer with pause/resume and visibility-change anti-cheat, navigator, results,
   localStorage history, and basic modals.
*/

// ---------- CONFIG / STORAGE KEYS ----------
const STORAGE_KEYS = {
  HISTORY: 'mockquiz_history_v1',
  SETTINGS: 'mockquiz_settings_v1'
};

// ---------- APP STATE ----------
const App = {
  db: typeof QUIZ_DB !== 'undefined' ? QUIZ_DB : { subjects: [] },
  state: {
    view: 'home',
    quiz: null, // when quiz active: object with quiz state
    currentQuestionIndex: 0,
    timer: null,
    timeLeft: 0,
    isPaused: false,
    tabHiddenCount: 0
  }
};

// ---------- UTILITIES ----------
function $(sel, root=document) { return root.querySelector(sel); }
function $all(sel, root=document) { return Array.from(root.querySelectorAll(sel)); }
function formatTime(sec) {
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.floor(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}
function uid(prefix='id') { return `${prefix}-${Date.now()}-${Math.floor(Math.random()*10000)}`; }

function saveHistoryItem(item) {
  const arr = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
  arr.unshift(item);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(arr));
}
function loadHistory() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
}
function clearHistory() {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
}

// ---------- ROUTING / VIEW HANDLING ----------
const views = {
  home: $('#view-home'),
  subject: $('#view-subject'),
  daily: $('#view-daily'),
  fullmock: $('#view-fullmock'),
  quiz: $('#view-quiz'),
  results: $('#view-results'),
  help: $('#view-help')
};

function showView(name) {
  // prevent navigation if quiz active and not confirmed
  if (App.state.quiz && name !== 'quiz' && name !== 'results') {
    // ask user what to do
    showModal({title: 'Quiz in progress', body: 'A quiz is currently running. Resume it or Cancel (Cancel will discard progress).', buttons: [
      {text: 'Resume', primary: true, onClick: () => { hideModal(); showView('quiz'); }},
      {text: 'Cancel Quiz', onClick: () => { hideModal(); cancelQuiz(); showView('home'); }}
    ]});
    return;
  }

  Object.values(views).forEach(v => v.classList.add('hidden'));
  views[name].classList.remove('hidden');
  App.state.view = name;

  // additional render hooks
  if (name === 'subject') renderSubjects();
  if (name === 'daily') renderDaily();
  if (name === 'fullmock') renderFullMockSubjects();
  if (name === 'results') renderHistoryList();
}

// header nav
$all('.nav-item').forEach(btn => btn.addEventListener('click', (e) => {
  const target = btn.dataset.nav;
  showView(target);
}));
// home links
$all('.link-btn').forEach(btn => btn.addEventListener('click', e => showView(btn.dataset.nav)));

// initial view
showView('home');

// ---------- MODAL SYSTEM ----------
const modalRoot = $('#modal-root');
function showModal({title='Confirm', body='', buttons=[{text:'OK', primary:true}]}){
  modalRoot.innerHTML = '';
  const modal = document.createElement('div');
  modal.className = 'history-card';
  const h = document.createElement('h3'); h.textContent = title;
  const p = document.createElement('p'); p.innerHTML = body;
  const actions = document.createElement('div');
  buttons.forEach(b => {
    const btn = document.createElement('button');
    btn.textContent = b.text;
    btn.style.marginRight = '8px';
    if (b.primary) btn.style.fontWeight = '700';
    btn.addEventListener('click', () => {
      if (b.onClick) b.onClick();
      // default behavior: close if not prevented
      if (!b.preventClose) hideModal();
    });
    actions.appendChild(btn);
  });
  modal.appendChild(h); modal.appendChild(p); modal.appendChild(actions);
  modalRoot.appendChild(modal);
}
function hideModal(){ modalRoot.innerHTML = ''; }

// ---------- RENDER: SUBJECTS & TOPICS ----------
function renderSubjects(){
  const container = $('#subjects-list');
  container.innerHTML = '';
  App.db.subjects.forEach(sub => {
    const btn = document.createElement('button');
    btn.textContent = sub.name;
    btn.addEventListener('click', () => openSubject(sub.id));
    container.appendChild(btn);
  });
}

function openSubject(subId){
  const subj = App.db.subjects.find(s => s.id === subId);
  if (!subj) return;
  $('#subject-topics').classList.remove('hidden');
  $('#selected-subject-name').textContent = subj.name;
  const topicsList = $('#topics-list'); topicsList.innerHTML = '';
  subj.topics.forEach(t => {
    const cbWrap = document.createElement('label');
    cbWrap.style.display = 'block';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = t.id; cb.name = 'topicselect';
    cbWrap.appendChild(cb);
    cbWrap.appendChild(document.createTextNode(' ' + t.name));
    topicsList.appendChild(cbWrap);
  });

  // attach start
  $('#subject-start').onclick = () => startSubjectQuiz(subj.id);
  $('#subject-cancel').onclick = () => { $('#subject-topics').classList.add('hidden'); };
}

// ---------- DAILY QUIZ ----------
function renderDaily(){
  // nothing to show special; just ensure defaults available
}

// ---------- FULL MOCK ----------
function renderFullMockSubjects(){
  const container = $('#fullmock-subjects'); container.innerHTML = '';
  App.db.subjects.forEach(sub => {
    const btn = document.createElement('button'); btn.textContent = sub.name;
    btn.addEventListener('click', () => openFullMock(sub.id));
    container.appendChild(btn);
  });
}
function openFullMock(subId){
  const subj = App.db.subjects.find(s=>s.id===subId); if(!subj) return;
  $('#fullmock-setup').classList.remove('hidden');
  $('#fullmock-subject-name').textContent = subj.name;
  $('#fullmock-start').onclick = () => startFullMock(subj.id);
  $('#fullmock-cancel').onclick = () => $('#fullmock-setup').classList.add('hidden');
}

// ---------- QUIZ CREATION / SELECTION ----------
function collectQuestionsForSubjectTopics(subjId, topicIds=[], n=null){
  const subj = App.db.subjects.find(s=>s.id===subjId); if(!subj) return [];
  let pool = [];
  subj.topics.forEach(t => {
    if (topicIds.length===0 || topicIds.includes(t.id)){
      const qs = t.questions.map(q => ({...q, subjectId: subjId, topicId: t.id}));
      pool = pool.concat(qs);
    }
  });
  return pool;
}

function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function startSubjectQuiz(subjId){
  const checked = $all('input[name="topicselect"]:checked').map(cb=>cb.value);
  const n = parseInt($('#subject-numq').value||0,10);
  const minutes = parseInt($('#subject-timemin').value||0,10);
  if (!n || n<1 || !minutes || minutes<1) { showModal({title:'Invalid', body:'Please set a valid number of questions and time.'}); return; }
  const pool = collectQuestionsForSubjectTopics(subjId, checked);
  if (pool.length === 0) { showModal({title:'No questions', body:'Selected topics have no questions.'}); return; }
  const num = Math.min(n, pool.length);
  const selected = shuffleArray(pool).slice(0,num);
  createQuiz({mode:'subject', subjectId: subjId, topicIds: checked, questions: selected, timeAllowed: minutes*60});
}

function startDailyQuiz(){
  const n = parseInt($('#daily-numq').value||0,10);
  const minutes = parseInt($('#daily-timemin').value||0,10);
  if (!n || n<1 || !minutes || minutes<1) { showModal({title:'Invalid', body:'Please set a valid number of questions and time.'}); return; }
  // collect all questions
  let pool = [];
  App.db.subjects.forEach(s => s.topics.forEach(t => t.questions.forEach(q => pool.push({...q, subjectId: s.id, topicId: t.id}))));
  if (pool.length===0) { showModal({title:'No questions', body:'Database is empty.'}); return; }
  const num = Math.min(n, pool.length);
  const selected = shuffleArray(pool).slice(0,num);
  createQuiz({mode:'daily', subjectId: null, topicIds: [], questions: selected, timeAllowed: minutes*60});
}

function startFullMock(subjId){
  const n = parseInt($('#fullmock-numq').value||0,10);
  const minutes = parseInt($('#fullmock-timemin').value||0,10);
  if (!n || n<1 || !minutes || minutes<1) { showModal({title:'Invalid', body:'Please set a valid number of questions and time.'}); return; }
  const pool = collectQuestionsForSubjectTopics(subjId, []);
  if (pool.length===0) { showModal({title:'No questions', body:'This subject has no questions.'}); return; }
  const num = Math.min(n, pool.length);
  const selected = shuffleArray(pool).slice(0,num);
  createQuiz({mode:'fullmock', subjectId: subjId, topicIds: [], questions: selected, timeAllowed: minutes*60});
}

// attach daily start button
$('#daily-start').onclick = startDailyQuiz;

// ---------- QUIZ ENGINE ----------
function createQuiz({mode, subjectId, topicIds, questions, timeAllowed}){
  App.state.quiz = {
    id: uid('attempt'),
    mode, subjectId, topicIds, questions: questions.map(q => ({
      ...q,
      userAnswer: null,
      marked: false
    })),
    startedAt: new Date().toISOString(),
    timeAllowed, // seconds
    timeTaken: 0,
    tabSwitchCount: 0
  };
  App.state.currentQuestionIndex = 0;
  App.state.timeLeft = timeAllowed;
  App.state.isPaused = false;
  App.state.timer = null;
  App.state.tabHiddenCount = 0;

  // show quiz view
  renderQuizHeader();
  renderCurrentQuestion();
  renderNavigator();
  showView('quiz');
  startTimer();
  updateActiveQuizIndicator(true);
}

function cancelQuiz(){
  stopTimer();
  App.state.quiz = null;
  App.state.currentQuestionIndex = 0;
  App.state.timeLeft = 0;
  App.state.isPaused = false;
  updateActiveQuizIndicator(false);
}

function finishQuizSave(){
  // compute results
  const qz = App.state.quiz; if(!qz) return;
  stopTimer();
  const total = qz.questions.length;
  let score = 0, attempted = 0;
  const questions = qz.questions.map(q => {
    const isCorrect = (q.userAnswer !== null) && (q.userAnswer === q.answer);
    if (q.userAnswer !== null) attempted++;
    if (isCorrect) score += 1;
    return {
      questionId: q.id,
      text: q.text,
      options: q.options,
      correctIndex: q.answer,
      userIndex: q.userAnswer,
      isCorrect,
      explanation: q.explanation,
      subjectId: q.subjectId,
      topicId: q.topicId
    };
  });
  const accuracy = attempted ? (score/attempted*100) : 0;
  const timeTaken = qz.timeAllowed - App.state.timeLeft;
  const attemptObj = {
    attemptId: qz.id,
    date: new Date().toISOString(),
    mode: qz.mode,
    subjectId: qz.subjectId,
    topicIds: qz.topicIds,
    nQuestions: total,
    timeAllowed: qz.timeAllowed,
    timeTakenSeconds: timeTaken,
    score,
    attempted,
    unattempted: total - attempted,
    accuracyPercent: Math.round(accuracy*100)/100,
    questions,
    tabSwitchCount: qz.tabSwitchCount
  };

  saveHistoryItem(attemptObj);
  App.state.quiz = null;
  updateActiveQuizIndicator(false);
  renderHistoryList();
  showView('results');
}

// ---------- TIMER ----------
function startTimer(){
  stopTimer();
  App.state.timer = setInterval(() => {
    if (App.state.isPaused) return;
    App.state.timeLeft -= 1;
    if (App.state.timeLeft <= 0) {
      App.state.timeLeft = 0;
      updateTimerDisplay();
      stopTimer();
      // auto finish
      showModal({title: 'Time up', body: 'Time is over. Submit the quiz now.', buttons: [
        {text: 'Submit', primary: true, onClick: finishQuizSave},
        {text: 'View Results', onClick: () => { finishQuizSave(); }}
      ]});
      return;
    }
    updateTimerDisplay();
  }, 1000);
  updateTimerDisplay();
}
function stopTimer(){ if (App.state.timer) { clearInterval(App.state.timer); App.state.timer = null; } }

function updateTimerDisplay(){
  $('#timer-display').textContent = formatTime(App.state.timeLeft);
}

// Pause / Resume
function pauseQuiz(){
  App.state.isPaused = true;
  $('#pause-overlay').classList.remove('hidden');
  $('#timer-pause').classList.add('hidden');
  $('#timer-resume').classList.remove('hidden');
}
function resumeQuiz(){
  App.state.isPaused = false;
  $('#pause-overlay').classList.add('hidden');
  $('#timer-pause').classList.remove('hidden');
  $('#timer-resume').classList.add('hidden');
}

$('#timer-pause').onclick = () => pauseQuiz();
$('#timer-resume').onclick = () => resumeQuiz();
$('#overlay-resume').onclick = () => resumeQuiz();

// visibility change -> auto pause + increment counter
document.addEventListener('visibilitychange', () => {
  if (!App.state.quiz) return;
  if (document.hidden) {
    App.state.tabHiddenCount += 1;
    App.state.quiz.tabSwitchCount = (App.state.quiz.tabSwitchCount||0) + 1;
    pauseQuiz();
  }
});

// ---------- RENDER QUIZ UI ----------
function renderQuizHeader(){
  const qz = App.state.quiz; if(!qz) return;
  const title = qz.mode === 'daily' ? 'Daily Quiz' : (qz.mode==='fullmock'? 'Full Mock' : 'Subject Quiz');
  $('#quiz-title').textContent = title;
  const subname = qz.subjectId ? (App.db.subjects.find(s=>s.id===qz.subjectId)||{name:''}).name : '';
  $('#quiz-subtitle').textContent = subname;
  updateTimerDisplay();
}

function renderCurrentQuestion(){
  const qz = App.state.quiz; if(!qz) return;
  const idx = App.state.currentQuestionIndex;
  const q = qz.questions[idx];
  const area = $('#question-area'); area.innerHTML = '';

  const qnum = document.createElement('h3'); qnum.textContent = `Q${idx+1}. ${q.text}`;
  area.appendChild(qnum);
  if (q.image) {
    const img = document.createElement('img'); img.src = q.image; img.alt = 'question image'; img.style.maxWidth='100%'; img.style.display='block'; img.style.margin='8px 0';
    area.appendChild(img);
  }
  const opts = document.createElement('div');
  q.options.forEach((opt, i) => {
    const lab = document.createElement('label'); lab.style.display='block'; lab.style.margin='6px 0';
    const r = document.createElement('input'); r.type='radio'; r.name='option'; r.value=i; r.checked = (q.userAnswer===i);
    r.addEventListener('change', () => { q.userAnswer = i; renderNavigator(); });
    lab.appendChild(r); lab.appendChild(document.createTextNode(' ' + opt));
    opts.appendChild(lab);
  });
  area.appendChild(opts);

  // attach action buttons
  $('#prev-q').onclick = () => { if (App.state.currentQuestionIndex>0) { App.state.currentQuestionIndex--; renderCurrentQuestion(); renderNavigator(); } };
  $('#next-q').onclick = () => { if (App.state.currentQuestionIndex<qz.questions.length-1) { App.state.currentQuestionIndex++; renderCurrentQuestion(); renderNavigator(); } };
  $('#mark-review').onclick = () => { q.marked = !q.marked; renderNavigator(); };
  $('#clear-answer').onclick = () => { q.userAnswer = null; // clear radio
    $all('input[name="option"]').forEach(inp => inp.checked = false); renderNavigator(); };
  $('#finish-quiz').onclick = () => {
    showModal({title: 'Submit Quiz', body: 'Are you sure you want to submit the quiz? You will not be able to change answers afterwards.', buttons:[
      {text: 'Submit', primary:true, onClick: finishQuizSave},
      {text: 'Cancel'}
    ]});
  };
}

function renderNavigator(){
  const qz = App.state.quiz; if(!qz) return;
  const nav = $('#navigator-grid'); nav.innerHTML = '';
  qz.questions.forEach((q, i) => {
    const btn = document.createElement('button'); btn.textContent = i+1;
    if (i === App.state.currentQuestionIndex) btn.classList.add('current');
    if (q.userAnswer !== null) btn.classList.add('answered');
    if (q.marked) btn.classList.add('marked');
    btn.addEventListener('click', () => { App.state.currentQuestionIndex = i; renderCurrentQuestion(); renderNavigator(); });
    nav.appendChild(btn);
  });
}

function updateActiveQuizIndicator(active){
  const el = $('#active-quiz-indicator');
  if (active) el.textContent = 'Quiz active'; else el.textContent = '';
}

// ---------- HISTORY / RESULTS ----------
function renderHistoryList(){
  const container = $('#history-list'); container.innerHTML = '';
  const arr = loadHistory();
  if (arr.length===0) { container.textContent = 'No history yet.'; return; }
  arr.forEach(item => {
    const card = document.createElement('div'); card.className='history-card';
    const title = document.createElement('div'); title.innerHTML = `<strong>${item.mode.toUpperCase()}</strong> — ${item.nQuestions} Qs`;
    const meta = document.createElement('div'); meta.textContent = `Score: ${item.score} | Attempted: ${item.attempted} | Accuracy: ${item.accuracyPercent}%`;
    const date = document.createElement('div'); date.textContent = `Date: ${new Date(item.date).toLocaleString()}`;
    const viewBtn = document.createElement('button'); viewBtn.textContent='View Details'; viewBtn.addEventListener('click', ()=>showAttemptDetail(item));
    const delBtn = document.createElement('button'); delBtn.style.marginLeft='8px'; delBtn.textContent='Delete'; delBtn.addEventListener('click', ()=>{
      showModal({title:'Delete', body:'Delete this attempt?', buttons:[{text:'Delete', primary:true, onClick: ()=>{ deleteHistoryItem(item.attemptId); }},{text:'Cancel'}]});
    });
    card.appendChild(title); card.appendChild(meta); card.appendChild(date); card.appendChild(viewBtn); card.appendChild(delBtn);
    container.appendChild(card);
  });
}

function deleteHistoryItem(attemptId){
  const arr = loadHistory().filter(x=>x.attemptId!==attemptId);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(arr));
  renderHistoryList();
}

function showAttemptDetail(item){
  const detail = $('#result-detail'); detail.classList.remove('hidden'); detail.innerHTML = '';
  const h = document.createElement('h3'); h.textContent = `Result — ${item.nQuestions} Qs | Score ${item.score}`;
  detail.appendChild(h);
  const info = document.createElement('div');
  info.innerHTML = `<p>Date: ${new Date(item.date).toLocaleString()}</p><p>Attempted: ${item.attempted} | Unattempted: ${item.unattempted} | Accuracy: ${item.accuracyPercent}%</p>`;
  detail.appendChild(info);

  item.questions.forEach((q,i) => {
    const qdiv = document.createElement('div'); qdiv.className='history-card';
    const qh = document.createElement('h4'); qh.textContent = `Q${i+1}. ${q.text}`;
    qdiv.appendChild(qh);
    if (q.options && q.options.length){
      q.options.forEach((opt, idx) => {
        const p = document.createElement('p');
        let mark = '';
        if (idx === q.correctIndex) mark = ' (Correct)';
        if (idx === q.userIndex) mark += ' (You)';
        p.textContent = `${String.fromCharCode(65+idx)}. ${opt}${mark}`;
        qdiv.appendChild(p);
      });
    }
    const expl = document.createElement('p'); expl.innerHTML = `<strong>Explanation:</strong> ${q.explanation || '—'}`;
    qdiv.appendChild(expl);
    detail.appendChild(qdiv);
  });
  // scroll to detail
  detail.scrollIntoView({behavior:'smooth'});
}

// clear history button
$('#clear-history').onclick = () => {
  showModal({title:'Clear history', body:'Clear all saved attempts?', buttons:[{text:'Clear', primary:true, onClick: ()=>{ clearHistory(); renderHistoryList(); }},{text:'Cancel'}]});
};

// ---------- INIT: attach subject/fullmock start buttons ----------
$('#subject-start').onclick = () => {
  // handled when opening subject; kept for safety
  const selectedSub = App.db.subjects[0];
  if (selectedSub) startSubjectQuiz(selectedSub.id);
};

$('#fullmock-start').onclick = () => {
  // handled by openFullMock
};

// ---------- Prevent accidental unload if quiz active ----------
window.addEventListener('beforeunload', (e) => {
  if (App.state.quiz) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ---------- EXTRAS: import/export DB or history (owner) ----------
// simple export history as JSON link
function exportHistory(){
  const data = JSON.stringify(loadHistory(),null,2);
  const blob = new Blob([data], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='mockquiz_history.json'; document.body.appendChild(a); a.click(); a.remove();
}

// keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!App.state.quiz) return;
  if (e.key === 'ArrowRight') { $('#next-q').click(); }
  if (e.key === 'ArrowLeft') { $('#prev-q').click(); }
});

// init: render subjects & fullmock subjects
renderSubjects(); renderFullMockSubjects();

// expose for debug (optional)
window.MockQuiz = { App, saveHistoryItem, loadHistory, exportHistory };
