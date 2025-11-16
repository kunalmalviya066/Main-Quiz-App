// script.js
import * as DB from './db.js';
import { $, $all, formatTimeSeconds, uid, blockCopyPaste } from './utils.js';

const subjectListEl = $('#subject-list');
const topicListEl = $('#topic-list');
const subjectCardsEl = $('#subject-cards');
const inputNumQuestions = $('#input-num-questions');
const chkShuffle = $('#chk-shuffle');
const inputTimerMins = $('#input-timer-mins');
const startTestBtn = $('#start-test');

const builderBtn = $('#btn-build');
const dailyBtn = $('#btn-daily');
const homeView = $('#home-view');
const builderView = $('#builder-view');
const quizView = $('#quiz-view');
const resultsView = $('#results-view');

const builderSubject = $('#builder-subject');
const builderTopics = $('#builder-topics');
const builderCreate = $('#builder-create');
const builderPreview = $('#builder-preview');

const questionCard = $('#question-card');
const prevBtn = $('#prev-btn');
const nextBtn = $('#next-btn');
const markBtn = $('#mark-btn');
const navigatorGrid = $('#navigator-grid');
const submitTestBtn = $('#submit-test');

const timerEl = $('#timer');
const btnFullscreen = $('#btn-fullscreen');
const btnPause = $('#btn-pause');

let current = {
  subjectId: null,
  topicId: null,
  questions: [],
  cursor: 0,
  answers: {},
  marked: {},
  startAt: null,
  totalSeconds: 0,
  paused: false
};

function renderSubjects(){
  const subs = DB.listSubjects();
  subjectListEl.innerHTML = '';
  subjectCardsEl.innerHTML = '';
  subs.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s.name;
    li.dataset.id = s.id;
    li.addEventListener('click', () => {
      selectSubject(s.id);
    });
    subjectListEl.appendChild(li);

    // card
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${s.name}</h3><p class="muted">Click to explore topics & start tests</p>`;
    card.addEventListener('click', ()=>selectSubject(s.id));
    subjectCardsEl.appendChild(card);
  });
}

function renderTopics(subjectId){
  const topics = DB.listTopics(subjectId);
  topicListEl.innerHTML = '';
  builderTopics.innerHTML = '';
  topics.forEach(t=>{
    const li = document.createElement('li');
    li.textContent = t.name;
    li.dataset.id = t.id;
    li.addEventListener('click', ()=>selectTopic(t.id));
    topicListEl.appendChild(li);

    // builder multi-select
    const opt = document.createElement('option');
    opt.value = t.id;
    opt.textContent = t.name;
    builderTopics.appendChild(opt);
  });
}

function selectSubject(id){
  current.subjectId = id;
  renderTopics(id);
  // highlight
  $all('#subject-list li').forEach(li=>{
    li.classList.toggle('active', li.dataset.id === id);
  });
  homeView.scrollIntoView({behavior:'smooth'});
}

function selectTopic(id){
  current.topicId = id;
  $all('#topic-list li').forEach(li=>{
    li.classList.toggle('active', li.dataset.id === id);
  });
  // show details or builder preview
}

function wireBuilder(){
  // fill subjects select
  builderSubject.innerHTML = '';
  DB.listSubjects().forEach(s=>{
    const opt = document.createElement('option');
    opt.value = s.id; opt.textContent = s.name;
    builderSubject.appendChild(opt);
  });

  builderCreate.addEventListener('click', ()=>{
    const subjectId = builderSubject.value;
    const selectedTopics = Array.from(builderTopics.selectedOptions).map(o=>o.value);
    createCustomTest({subjectId, topicIds: selectedTopics});
  });
}

function createCustomTest({subjectId, topicIds=[]}){
  const n = Math.max(1, Number(inputNumQuestions.value) || 10);
  let pool = [];
  if(topicIds.length){
    topicIds.forEach(tid => pool = pool.concat(DB.listQuestions({topicId: tid})));
  } else if(subjectId){
    pool = DB.listQuestions({subjectId});
  } else {
    pool = DB.listQuestions();
  }
  // shuffle pool
  pool = pool.slice();
  for(let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const selection = pool.slice(0,n);
  if(selection.length === 0){
    builderPreview.innerHTML = '<div class="card">No questions found for selected subject/topics.</div>';
    return;
  }
  // show preview
  builderPreview.innerHTML = `<div class="card"><h4>Preview (${selection.length} questions)</h4><ol>${selection.map(q=>`<li>${escapeHtml(q.text)}</li>`).join('')}</ol><div class="actions"><button id="preview-start" class="btn primary">Start This Test</button></div></div>`;
  $('#preview-start').addEventListener('click', ()=>startTest(selection));
}

function startTest(questions){
  // set current
  current.questions = questions.map(q => ({
    ...q,
    choices: chkShuffle.checked ? shuffleArray(q.choices.slice()) : q.choices.slice()
  }));
  current.cursor = 0;
  current.answers = {};
  current.marked = {};
  const mins = Number(inputTimerMins.value) || 0;
  current.totalSeconds = mins * 60;
  current.startAt = Date.now();
  showQuizView();
  renderQuestion();
  renderNavigator();
  startTimer();
  blockCopyPaste(); // basic anti-copy
}

function showQuizView(){
  homeView.classList.add('hidden');
  builderView.classList.add('hidden');
  resultsView.classList.add('hidden');
  quizView.classList.remove('hidden');
}

/* Timer scaffolding (will be completed in second half) */
let timerInterval = null;
let remainingSeconds = 0;
function startTimer(){
  if(current.totalSeconds > 0){
    remainingSeconds = current.totalSeconds;
    updateTimerUI();
    if(timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(()=>{
      if(!current.paused){
        remainingSeconds--;
        updateTimerUI();
        if(remainingSeconds <= 0){
          clearInterval(timerInterval);
          // auto submit (finalization in second half)
        }
      }
    }, 1000);
  } else {
    timerEl.textContent = '—';
  }
}
function updateTimerUI(){
  timerEl.textContent = formatTimeSeconds(remainingSeconds);
}

/* Render question */
function renderQuestion(){
  const q = current.questions[current.cursor];
  if(!q){
    questionCard.innerHTML = '<p>No question</p>';
    return;
  }
  const choicesHtml = q.choices.map((c, idx)=>{
    return `<li data-idx="${idx}" class="opt">${escapeHtml(c)}</li>`;
  }).join('');
  const imgHtml = q.image ? `<img src="${q.image}" alt="question image" style="max-width:100%;border-radius:10px;margin-top:8px;" />` : '';
  questionCard.innerHTML = `
    <div>
      <h3>Q${current.cursor+1}. ${escapeHtml(q.text)}</h3>
      ${imgHtml}
      <ul class="options">${choicesHtml}</ul>
    </div>
  `;
  // wire options
  $all('.opt', questionCard).forEach(li=>{
    li.addEventListener('click', ()=>{
      const idx = Number(li.dataset.idx);
      selectAnswer(current.cursor, idx);
    });
  });
  // highlight selected
  highlightSelection();
}

function selectAnswer(index, choiceIdx){
  current.answers[index] = choiceIdx;
  renderNavigator();
  highlightSelection();
}

function highlightSelection(){
  $all('.options li', questionCard).forEach(li=>{
    li.classList.remove('selected');
  });
  const sel = current.answers[current.cursor];
  if(typeof sel !== 'undefined'){
    const el = questionCard.querySelector(`.options li[data-idx="${sel}"]`);
    if(el) el.classList.add('selected');
  }
}

/* Navigator */
function renderNavigator(){
  navigatorGrid.innerHTML = '';
  current.questions.forEach((q, i)=>{
    const btn = document.createElement('button');
    btn.textContent = (i+1);
    if(current.marked[i]) btn.classList.add('marked');
    if(typeof current.answers[i] !== 'undefined') btn.classList.add('answered');
    btn.addEventListener('click', ()=>{ goTo(i); });
    navigatorGrid.appendChild(btn);
  });
}

function goTo(i){
  current.cursor = i;
  renderQuestion();
}

/* Controls */
prevBtn.addEventListener('click', ()=>{
  if(current.cursor > 0) { current.cursor--; renderQuestion(); }
});
nextBtn.addEventListener('click', ()=>{
  if(current.cursor < current.questions.length - 1){ current.cursor++; renderQuestion(); }
});
markBtn.addEventListener('click', ()=>{
  current.marked[current.cursor] = !current.marked[current.cursor];
  renderNavigator();
});

/* Daily quiz quick launcher */
dailyBtn.addEventListener('click', ()=>{
  // pick random 10 from DB
  const all = DB.listQuestions();
  const sel = shuffleArray(all).slice(0, 10).map(q=>({...q, choices: q.choices.slice()}));
  startTest(sel);
});

/* Start Test from side panel */
startTestBtn.addEventListener('click', ()=>{
  const subj = current.subjectId;
  const topic = current.topicId;
  const n = Math.max(1, Number(inputNumQuestions.value) || 10);
  let pool = [];
  if(topic) pool = DB.listQuestions({topicId: topic});
  else if(subj) pool = DB.listQuestions({subjectId: subj});
  else pool = DB.listQuestions();
  pool = shuffleArray(pool).slice(0,n).map(q=>({...q, choices: q.choices.slice()}));
  startTest(pool);
});

/* builder button wiring */
builderBtn.addEventListener('click', ()=>{
  homeView.classList.add('hidden');
  builderView.classList.remove('hidden');
  quizView.classList.add('hidden');
});

/* fullscreen & pause buttons basic wiring */
btnFullscreen.addEventListener('click', ()=>{
  if(!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
});
btnPause.addEventListener('click', ()=>{
  current.paused = !current.paused;
  btnPause.textContent = current.paused ? 'Resume' : 'Pause';
});

/* Submit (simple) */
submitTestBtn.addEventListener('click', ()=>{
  // we will finalize and compute results in second half
  // but store a placeholder: move to results view
  resultsView.innerHTML = `<div class="card"><h3>Submitting...</h3><p>Final results will be computed in the next batch.</p></div>`;
  quizView.classList.add('hidden');
  resultsView.classList.remove('hidden');
});

/* ---------- SECOND HALF IMPLEMENTATION ---------- */

/* Anti-cheat features */
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('selectstart', e => e.preventDefault());
document.addEventListener('keydown', e => {
  if (e.ctrlKey && ['c','v','x','u','s'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
  if (e.key === 'F12') e.preventDefault();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    current.paused = true;
    btnPause.textContent = 'Resume';
  }
});

/* Submit test fully */
submitTestBtn.addEventListener('click', finalizeTest);

function finalizeTest(){
  clearInterval(timerInterval);

  const endAt = Date.now();
  const duration = Math.floor((endAt - current.startAt)/1000);

  const report = computeReport(duration);
  DB.saveUserResult(report);

  displayReport(report);
}

/* Compute score and stats */
function computeReport(duration){
  let correct = 0;
  let attempted = 0;
  const details = [];

  current.questions.forEach((q, i)=>{
    const chosen = current.answers[i];
    const actual = q.answerIndex;
    const isAtt = typeof chosen !== 'undefined';
    const isCorrect = (chosen === q.choices.indexOf(q.choices[actual]));

    if(isAtt) attempted++;
    if(isCorrect) correct++;

    details.push({
      text: q.text,
      choices: q.choices,
      answerIndex: actual,
      chosen: chosen,
      image: q.image || ''
    });
  });

  return {
    id: uid('test'),
    takenAt: new Date().toISOString(),
    total: current.questions.length,
    correct,
    attempted,
    duration,
    accuracy: correct/current.questions.length,
    details
  };
}

/* Results View */
function displayReport(r){
  quizView.classList.add('hidden');
  resultsView.classList.remove('hidden');

  resultsView.innerHTML = `
    <h2>Results</h2>
    <div class="card">
      <p><strong>Score:</strong> ${r.correct} / ${r.total}</p>
      <p><strong>Accuracy:</strong> ${(r.accuracy*100).toFixed(1)}%</p>
      <p><strong>Attempted:</strong> ${r.attempted}</p>
      <p><strong>Unattempted:</strong> ${r.total - r.attempted}</p>
      <p><strong>Time Taken:</strong> ${formatTimeSeconds(r.duration)}</p>
    </div>

    <h3>Review Questions</h3>
    <div id="review-area"></div>
  `;

  const rev = $('#review-area');
  r.details.forEach((d, i)=>{
    const opts = d.choices.map((c, idx)=>{
      const correct = idx === d.answerIndex;
      const chosen = idx === d.chosen;
      return `
        <li class="${correct?'correct':''} ${chosen&&!correct?'wrong':''}">
          ${escapeHtml(c)}
          ${correct?' <strong>(Correct)</strong>':''}
          ${chosen&&!correct?' <strong>(Your Choice)</strong>':''}
        </li>
      `;
    }).join('');
    rev.innerHTML += `
      <div class="card" style="margin-top:12px">
        <h4>Q${i+1}. ${escapeHtml(d.text)}</h4>
        ${d.image?`<img src="${d.image}" style="max-width:100%;margin-top:10px">`:''}
        <ul class="options">${opts}</ul>
      </div>
    `;
  });
}

/* Home page test history preview */
function renderHistoryPreview(){
  const db = DB.getDB();
  const hist = db.users || [];
  const area = document.createElement('div');
  area.className = 'card';
  area.innerHTML = `<h3>Your Test History</h3>`;
  if(hist.length === 0){
    area.innerHTML += `<p class="muted">No tests taken yet.</p>`;
  } else {
    area.innerHTML += hist.slice().reverse().map(h=>{
      return `<div class="card">
        <strong>${new Date(h.takenAt).toLocaleString()}</strong>
        <p>Score: ${h.correct}/${h.total} (${(h.accuracy*100).toFixed(1)}%)</p>
        <p>Time: ${formatTimeSeconds(h.duration)}</p>
      </div>`;
    }).join('');
  }
  homeView.appendChild(area);
}
renderHistoryPreview();


/* Utilities */
function shuffleArray(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function escapeHtml(str){
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* init */
function init(){
  renderSubjects();
  renderTopics(null);
  wireBuilder();
  homeView.classList.remove('hidden');
}
init();

/* Expose some for debugging */
window.__QUIZLAB = { DB, current };
