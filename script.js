/* script.js - main application logic */
(function(){
  // basic app state
  const App = {
    state: {
      selectedSubjects: [],
      selectedTopics: [],
      questionPool: [],
      quiz: null,
      currentIdx: 0,
      timerSecLeft: 0,
      timerInterval: null,
      paused: false,
      antiCheatEnabled: true,
      visibilitySwitches: 0
    }
  };

  // element refs
  const qViews = {};
  function $id(id){ return document.getElementById(id); }

  function init(){
    // map views
    document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', navClick));
    document.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
    document.querySelectorAll('[data-action]').forEach(b => b.addEventListener('click', navAction));

    $id('start-practice').addEventListener('click', ()=> showView('subjects'));
    $id('daily-quick').addEventListener('click', startDaily);
    $id('btn-back-home').addEventListener('click', ()=> showView('home'));
    $id('btn-start-quiz').addEventListener('click', startSelectedQuiz);
    $id('btn-start-custom').addEventListener('click', startCustomMock);
    $id('btn-prev').addEventListener('click', prevQuestion);
    $id('btn-next').addEventListener('click', nextQuestion);
    $id('btn-mark').addEventListener('click', toggleMark);
    $id('btn-pause').addEventListener('click', togglePause);
    $id('btn-submit').addEventListener('click', submitQuiz);
    $id('btn-fullscreen').addEventListener('click', toggleFullScreen);
    $id('btn-review-home').addEventListener('click', ()=> showView('home'));
    $id('btn-download-history').addEventListener('click', ()=> utils.downloadJSON('history.json', DB.getHistory()));
    $id('btn-clear-history').addEventListener('click', ()=> { DB.clearHistory(); renderHistory(); });
    $id('btn-export-history').addEventListener('click', ()=> utils.downloadJSON('history.json', DB.getHistory()));

    // nav helper
    document.getElementById('nav-daily').addEventListener('click', startDaily);

    // initial render
    renderFeaturedSubjects();
    renderSubjectsList();
    renderCustomSubjects();
    renderHistory();

    // anti-cheat handlers
    document.addEventListener('contextmenu', e => { if (App.state.antiCheatEnabled) e.preventDefault(); });
    document.addEventListener('copy', e => { if (App.state.antiCheatEnabled) e.preventDefault(); });
    document.addEventListener('paste', e => { if (App.state.antiCheatEnabled) e.preventDefault(); });

    document.addEventListener('visibilitychange', ()=>{
      if (document.hidden && App.state.quiz && App.state.antiCheatEnabled){
        App.state.visibilitySwitches++;
        pauseForReason('Tab hidden — quiz paused');
      }
    });
  }

  function navClick(ev){
    const v = ev.target.dataset.view;
    if (v) showView(v);
  }
  function navAction(ev){
    const a = ev.target.dataset.action;
    if (a === 'daily') startDaily();
  }

  // Views
  function showView(viewId){
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const v = $id('view-' + viewId);
    if (v) v.classList.add('active');
    window.scrollTo(0,0);
  }

  // Subjects listing
  function renderFeaturedSubjects(){
    const container = $id('featured-subjects');
    container.innerHTML = '';
    const subs = DB.getSubjects();
    subs.forEach(s => {
      const el = document.createElement('div');
      el.className = 'subject-card card';
      el.innerHTML = `<div class="title">${s.name}</div><div class="desc">${s.description||''}</div>
        <div><button class="btn" data-sub="${s.id}">Practice</button></div>`;
      el.querySelector('button').addEventListener('click', ()=>{
        App.state.selectedSubjects = [s.id];
        showView('subjects');
        renderSubjectsList();
        expandTopicsFor([s.id]);
      });
      container.appendChild(el);
    });
  }

  function renderSubjectsList(){
    const list = $id('subjects-list');
    list.innerHTML = '';
    const subs = DB.getSubjects();
    subs.forEach(s => {
      const el = document.createElement('div');
      el.className = 'card subject-item';
      el.innerHTML = `<div><strong>${s.name}</strong></div><div class="muted">${s.description||''}</div>
        <div style="margin-top:8px"><button class="btn select-sub" data-sub="${s.id}">Select</button></div>`;
      el.querySelector('.select-sub').addEventListener('click', ()=>{
        // toggle selection
        const idx = App.state.selectedSubjects.indexOf(s.id);
        if (idx === -1) App.state.selectedSubjects.push(s.id); else App.state.selectedSubjects.splice(idx,1);
        renderSubjectsList();
        renderTopicsArea();
      });
      if (App.state.selectedSubjects.includes(s.id)){
        el.style.border = `2px solid ${getComputedStyle(document.documentElement).getPropertyValue('--accent')}`;
      }
      list.appendChild(el);
    });

    renderTopicsArea();
  }

  function expandTopicsFor(subjectIds){
    App.state.selectedSubjects = subjectIds.slice();
    renderSubjectsList();
    renderTopicsArea();
  }

  function renderTopicsArea(){
    const topicsArea = $id('topics-area');
    const topicsList = $id('topics-list');
    if (!App.state.selectedSubjects.length){
      topicsArea.style.display = 'none'; return;
    }
    topicsArea.style.display = 'block';
    const topics = DB.findTopicsBySubjects(App.state.selectedSubjects);
    topicsList.innerHTML = '';
    topics.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'topic-chip';
      btn.textContent = t.name;
      if (App.state.selectedTopics.includes(t.id)) btn.classList.add('selected');
      btn.addEventListener('click', ()=>{
        const idx = App.state.selectedTopics.indexOf(t.id);
        if (idx === -1) App.state.selectedTopics.push(t.id); else App.state.selectedTopics.splice(idx,1);
        renderTopicsArea();
      });
      topicsList.appendChild(btn);
    });
  }

  // Custom subjects list
  function renderCustomSubjects(){
    const sel = $id('custom-subjects');
    sel.innerHTML = '';
    DB.getSubjects().forEach(s=>{
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name;
      sel.appendChild(opt);
    });
  }

  // Start flows
  function startDaily(){
    const questions = DB.getDailyQuiz(10);
    startQuizFromQuestions({ questions, meta: { type: 'daily', title: 'Daily Quiz' } });
  }

  function startSelectedQuiz(){
    const num = parseInt($id('num-questions').value,10) || 10;
    const timerMin = parseInt($id('timer-min').value,10) || 0;
    const shuffleChoices = $id('shuffle-choices').checked;
    const antiCheat = $id('anti-cheat').checked;
    App.state.antiCheatEnabled = antiCheat;

    // pick pool
    const pool = DB.questionsByFilter({ subjectIds: App.state.selectedSubjects, topicIds: App.state.selectedTopics });
    if (!pool.length){
      alert('No questions match your selection. Try selecting more topics/subjects.');
      return;
    }
    if (pool.length < num){
      if (!confirm(`Only ${pool.length} questions available but you asked for ${num}. Start with ${pool.length}?`)) return;
    }
    const qcount = Math.min(num, pool.length);
    const shuffled = utils.shuffle(pool);
    const selected = shuffled.slice(0, qcount);
    startQuizFromQuestions({questions: selected, meta: {type:'custom', title:'Practice'} , timerMin, shuffleChoices});
  }

  function startCustomMock(){
    const subs = Array.from($id('custom-subjects').selectedOptions).map(o=>o.value);
    const num = parseInt($id('custom-num').value,10) || 10;
    const timerMin = parseInt($id('custom-timer').value,10) || 0;
    if (!subs.length){ alert('Select at least one subject'); return; }
    const pool = DB.questionsByFilter({ subjectIds: subs, topicIds: []});
    if (!pool.length){ alert('No questions for selected subjects'); return; }
    const qcount = Math.min(num, pool.length);
    const selected = utils.shuffle(pool).slice(0,qcount);
    startQuizFromQuestions({ questions: selected, meta:{type:'mock', title:'Full Mock'}, timerMin, shuffleChoices:true });
  }

  // Core: prepare quiz object and render quiz view
  function startQuizFromQuestions({questions, meta={}, timerMin=0, shuffleChoices=true}){
    // build quiz structure
    const quiz = {
      id: utils.uid('attempt'),
      meta,
      questions: questions.map(q => {
        const choices = shuffleChoices ? utils.shuffle(q.choices) : q.choices.slice();
        // map correct index to value (text)
        const correctText = q.choices[q.correctIndex];
        const mappedCorrectIndex = choices.indexOf(correctText);
        return {
          qId: q.id,
          subjectId: q.subjectId,
          topicId: q.topicId,
          question: q.question,
          image: q.image || null,
          choices,
          correctIndex: mappedCorrectIndex,
          explanation: q.explanation || '',
          createdAt: q.createdAt
        };
      }),
      answers: [], // {selectedIndex, timeTaken, marked}
      startTime: Date.now(),
      endTime: null,
      durationSec: 0,
      visibilitySwitches: 0
    };

    // init answers
    quiz.questions.forEach(()=> quiz.answers.push({selectedIndex: null, timeTaken:0, marked:false}));

    App.state.quiz = quiz;
    App.state.currentIdx = 0;
    App.state.timerSecLeft = (timerMin>0) ? timerMin*60 : 0;
    App.state.paused = false;
    App.state.visibilitySwitches = 0;
    // start timer if needed
    startTimerIfNeeded();

    showView('quiz');
    renderQuiz();
  }

  function startTimerIfNeeded(){
    clearInterval(App.state.timerInterval);
    if (App.state.timerSecLeft > 0){
      $id('hud-timer').textContent = utils.formatTime(App.state.timerSecLeft);
      App.state.timerInterval = setInterval(()=>{
        if (App.state.paused) return;
        App.state.timerSecLeft--;
        if (App.state.timerSecLeft <= 0){
          clearInterval(App.state.timerInterval);
          submitQuiz();
        }
        $id('hud-timer').textContent = utils.formatTime(App.state.timerSecLeft);
      },1000);
    } else {
      $id('hud-timer').textContent = '--:--';
    }
  }

  // Render the quiz UI
  function renderQuiz(){
    const quiz = App.state.quiz;
    if (!quiz) return;
    const idx = App.state.currentIdx;
    const qObj = quiz.questions[idx];
    $id('hud-qnum').textContent = idx+1;
    $id('hud-total').textContent = quiz.questions.length;
    $id('q-subject').textContent = (DB.getSubjects().find(s=>s.id===qObj.subjectId)||{}).name || '';
    $id('q-topic').textContent = (DB.getTopics().find(t=>t.id===qObj.topicId)||{}).name || '';
    $id('question-text').textContent = qObj.question;

    // render image if present
    const qImg = $id('question-image');
    qImg.innerHTML = '';
    if (qObj.image){
      const img = document.createElement('img');
      img.src = qObj.image;
      img.style.maxWidth = '100%';
      qImg.appendChild(img);
    }

    // choices
    const choicesDiv = $id('choices');
    choicesDiv.innerHTML = '';
    qObj.choices.forEach((c, ci)=>{
      const btn = document.createElement('div');
      btn.className = 'choice';
      btn.textContent = c;
      if (quiz.answers[idx].selectedIndex === ci) btn.classList.add('selected');
      btn.addEventListener('click', ()=>{
        quiz.answers[idx].selectedIndex = ci;
        renderQuiz();
      });
      choicesDiv.appendChild(btn);
    });

    renderNavigator();
    updateHUDTimeTaken();
  }

  function renderNavigator(){
    const nav = $id('navigator-grid');
    nav.innerHTML = '';
    const quiz = App.state.quiz;
    quiz.questions.forEach((q, i)=>{
      const b = document.createElement('button');
      b.textContent = i+1;
      b.className = '';
      const ans = quiz.answers[i];
      if (ans.selectedIndex !== null) b.style.background = '#fff8f9';
      if (ans.marked) b.style.border = '2px solid #ff7b90';
      b.addEventListener('click', ()=> { App.state.currentIdx = i; renderQuiz(); });
      nav.appendChild(b);
    });
  }

  function updateHUDTimeTaken(){
    // compute total time taken so far
    const quiz = App.state.quiz;
    const taken = quiz.answers.reduce((s,a)=> s + (a.timeTaken||0), 0);
    $id('hud-time-taken').textContent = `Time: ${taken}s`;
  }

  // navigation
  function prevQuestion(){ if (!App.state.quiz) return; if (App.state.currentIdx>0){ saveTimeForCurrent(); App.state.currentIdx--; renderQuiz(); } }
  function nextQuestion(){ if (!App.state.quiz) return; if (App.state.currentIdx < App.state.quiz.questions.length-1){ saveTimeForCurrent(); App.state.currentIdx++; renderQuiz(); } }

  // mark for review
  function toggleMark(){
    const quiz = App.state.quiz; const idx = App.state.currentIdx;
    quiz.answers[idx].marked = !quiz.answers[idx].marked;
    renderNavigator();
  }

  // timing per question: increment timeTaken every second for visible question
  let perQuestionTimer = null;
  function saveTimeForCurrent(){
    // nothing fancy: called when navigating away; we maintain per-question times with interval
  }

  // pause/resume
  function togglePause(){
    if (!App.state.quiz) return;
    App.state.paused = !App.state.paused;
    $id('btn-pause').textContent = App.state.paused ? 'Resume' : 'Pause';
  }

  function pauseForReason(msg){
    App.state.paused = true;
    $id('btn-pause').textContent = 'Resume';
    alert(msg || 'Quiz paused');
  }

  // Fullscreen
  function toggleFullScreen(){
    if (!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(()=>{});
    } else {
      document.exitFullscreen().catch(()=>{});
    }
  }

  // submit & results
  function submitQuiz(){
    if (!App.state.quiz) return;
    clearInterval(App.state.timerInterval);

    const quiz = App.state.quiz;
    quiz.endTime = Date.now();
    quiz.durationSec = Math.round((quiz.endTime - quiz.startTime)/1000);
    quiz.visibilitySwitches = App.state.visibilitySwitches;

    // compute score
    let correct = 0, attempted = 0;
    quiz.questions.forEach((q,i)=>{
      const ans = quiz.answers[i];
      if (ans.selectedIndex !== null) attempted++;
      if (ans.selectedIndex === q.correctIndex) correct++;
    });
    const total = quiz.questions.length;
    const accuracy = total? Math.round((correct/total)*100):0;
    const attemptedCount = attempted;

    const attemptRecord = {
      id: quiz.id,
      meta: quiz.meta,
      total,
      correct,
      accuracy,
      attempted: attemptedCount,
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      durationSec: quiz.durationSec,
      visibilitySwitches: quiz.visibilitySwitches,
      questions: quiz.questions,
      answers: quiz.answers
    };

    DB.saveAttempt(attemptRecord);
    renderResults(attemptRecord);
    App.state.quiz = null;
    showView('results');
    renderHistory();
  }

  // results rendering
  function renderResults(record){
    const out = $id('results-summary');
    out.innerHTML = `
      <div><strong>Score</strong><div style="font-size:28px">${record.correct} / ${record.total}</div></div>
      <div><strong>Accuracy</strong><div style="font-size:20px">${record.accuracy}%</div></div>
      <div><strong>Attempted</strong><div>${record.attempted}</div></div>
      <div><strong>Time</strong><div>${record.durationSec}s</div></div>
      <div><strong>Tab switches</strong><div>${record.visibilitySwitches}</div></div>
    `;

    const reviewList = $id('review-list');
    reviewList.innerHTML = '';
    record.questions.forEach((q,i)=>{
      const ans = record.answers[i];
      const div = document.createElement('div');
      div.className = 'card';
      const chosen = ans.selectedIndex !== null ? q.choices[ans.selectedIndex] : '(unattempted)';
      const correct = q.choices[q.correctIndex];
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between;align-items:center">
          <div><strong>Q${i+1}.</strong> ${q.question}</div>
          <div style="text-align:right"><small>Time: ${ans.timeTaken||0}s</small></div>
        </div>
        <div style="margin-top:8px"><strong>Your answer:</strong> ${chosen}</div>
        <div><strong>Correct:</strong> ${correct}</div>
        <div style="margin-top:8px"><em>${q.explanation || ''}</em></div>
      `;
      reviewList.appendChild(div);
    });
  }

  // history
  function renderHistory(){
    const list = $id('history-list');
    list.innerHTML = '';
    const history = DB.getHistory();
    if (!history.length){ list.textContent = 'No attempts yet.'; return; }
    history.forEach(h=>{
      const el = document.createElement('div');
      el.className = 'card';
      const date = new Date(h.startTime).toLocaleString();
      el.innerHTML = `<div style="display:flex;justify-content:space-between">
        <div><strong>${h.meta.title || h.meta.type}</strong><div class="muted">${date}</div></div>
        <div style="text-align:right"><div>${h.correct}/${h.total}</div><div class="muted">${h.accuracy}%</div></div>
      </div>
      <div style="margin-top:8px"><button class="btn view-attempt" data-id="${h.id}">View</button> <button class="btn" data-export="${h.id}">Export</button></div>`;
      el.querySelector('.view-attempt').addEventListener('click', ()=>{
        renderResults(h); showView('results');
      });
      el.querySelector('[data-export]').addEventListener('click', ()=>{
        utils.downloadJSON('attempt_' + h.id + '.json', h);
      });
      list.appendChild(el);
    });
  }

  // occasionally increment timeTaken for currently visible question
  setInterval(()=>{
    if (App.state.quiz && !App.state.paused){
      const idx = App.state.currentIdx;
      const ans = App.state.quiz.answers[idx];
      if (ans) { ans.timeTaken = (ans.timeTaken || 0) + 1; updateHUDTimeTaken(); }
    }
  },1000);

  // boot
  window.addEventListener('DOMContentLoaded', init);
})();
