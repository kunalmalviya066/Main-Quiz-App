/* script.js
   Handles user UI, building tests, quiz engine, anti-cheat and history.
*/
(function(){
  // elements
  const subjectList = document.getElementById('subject-list');
  const topicCards = document.getElementById('topic-cards');
  const builderTopic = document.getElementById('builder-topic');
  const builderCount = document.getElementById('builder-count');
  const builderTimer = document.getElementById('builder-timer');
  const builderShuffle = document.getElementById('builder-shuffle');
  const buildTestBtn = document.getElementById('build-test');
  const dailyQuizBtn = document.getElementById('daily-quiz-btn');
  const dailyInfo = document.getElementById('daily-info');
  const historyList = document.getElementById('history-list');
  const openAdmin = document.getElementById('open-admin');
  const openFullscreenBtn = document.getElementById('open-fullscreen');

  // quiz elements
  const landing = document.getElementById('landing');
  const quizScreen = document.getElementById('quiz-screen');
  const resultScreen = document.getElementById('result-screen');
  const qText = document.getElementById('q-text');
  const qImage = document.getElementById('q-image');
  const choicesEl = document.getElementById('choices');
  const qIndex = document.getElementById('q-index');
  const qTotal = document.getElementById('q-total');
  const prevBtn = document.getElementById('prev-q');
  const nextBtn = document.getElementById('next-q');
  const pauseBtn = document.getElementById('pause-resume');
  const timeLeftEl = document.getElementById('time-left');
  const navigatorPanel = document.getElementById('navigator');
  const navigatorGrid = document.getElementById('navigator-panel');
  const toggleNavigatorBtn = document.getElementById('toggle-navigator');
  const markReviewBtn = document.getElementById('mark-review');
  const endQuizBtn = document.getElementById('end-quiz');
  const navCloseBtn = document.getElementById('nav-close');
  const resultSummary = document.getElementById('result-summary');
  const resultDetails = document.getElementById('result-details');
  const reviewAnswersBtn = document.getElementById('review-answers');
  const restartBtn = document.getElementById('restart');

  // state
  let subjects = [];
  let topics = [];
  let questions = [];
  let currentQuiz = null; // {id,title,questions:[{...}], settings}
  let curIndex = 0;
  let timer = null;
  let paused = false;
  let timeRemaining = 0;
  let antiCheatFlags = {copies:0, visibilityChanges:0};
  let quizStartTs = null;

  // init
  function init(){
    subjects = DB.getSubjects();
    renderSubjects();
    renderHistory();
    attachEvents();
    refreshTopicsForBuilder();
    showDailyInfo();
    // auto-sync: listen for storage changes (cross-tab)
    window.addEventListener('storage', (e)=>{
      if(e.key === 'quiz_db_v1'){
        // reload data
        subjects = DB.getSubjects();
        renderSubjects();
        refreshTopicsForBuilder();
        if(currentQuiz) syncQuestionsInPlace();
      }
    });
  }

  function renderSubjects(){
    subjectList.innerHTML = '';
    subjects.forEach(s=>{
      const li = document.createElement('li');
      li.textContent = s.name;
      li.title = s.description || '';
      li.onclick = ()=>selectSubject(s.id);
      subjectList.appendChild(li);
    });
  }

  function selectSubject(subjectId){
    topics = DB.getTopics(subjectId);
    renderTopicCards();
    refreshTopicsForBuilder();
  }

  function renderTopicCards(){
    topicCards.innerHTML = '';
    topics.forEach(t=>{
      const card = document.createElement('div');
      card.className = 'topic-card';
      card.innerHTML = `<h4>${t.name}</h4><p>${t.description||''}</p><div class="mt"><button class="btn subtle start-topic" data-topic="${t.id}">Start</button></div>`;
      topicCards.appendChild(card);
    });
    document.querySelectorAll('.start-topic').forEach(btn=>{
      btn.onclick = ()=> {
        const topicId = btn.dataset.topic;
        const qs = DB.getQuestions({topicId});
        startQuiz({
          title: `Topic: ${topics.find(x=>x.id===topicId).name}`,
          questions: chooseN(qs, Math.min(qs.length, 10)),
          settings: { timerMins: 10, shuffleChoices: true }
        });
      }
    });
  }

  function refreshTopicsForBuilder(){
    builderTopic.innerHTML = '';
    const allTopics = DB.getTopics();
    allTopics.forEach(t=>{
      const opt = document.createElement('option');
      opt.value = t.id; opt.textContent = `${t.name} (${DB.getSubjects().find(s=>s.id===t.subjectId)?.name||''})`;
      builderTopic.appendChild(opt);
    });
  }

  function attachEvents(){
    buildTestBtn.onclick = ()=>{
      const topicId = builderTopic.value;
      const n = Math.max(1, parseInt(builderCount.value||10,10));
      const timerMins = Math.max(1, parseInt(builderTimer.value||10,10));
      const shuffle = !!builderShuffle.checked;
      const qs = DB.getQuestions({topicId});
      if(qs.length===0){ alert('No questions for selected topic'); return; }
      const selected = chooseN(qs, Math.min(n, qs.length));
      startQuiz({
        title: `Custom: ${document.querySelector('#builder-topic option:checked').textContent}`,
        questions: selected,
        settings: { timerMins, shuffleChoices: shuffle }
      });
    };

    dailyQuizBtn.onclick = ()=>startDailyQuiz();
    openAdmin.onclick = ()=> location.href = 'admin.html';
    openFullscreenBtn.onclick = ()=>toggleFullscreen();

    prevBtn.onclick = ()=>gotoQuestion(curIndex-1);
    nextBtn.onclick = ()=>gotoQuestion(curIndex+1);
    pauseBtn.onclick = togglePause;
    toggleNavigatorBtn.onclick = ()=>navigatorPanel.classList.toggle('hidden');
    markReviewBtn.onclick = ()=>toggleMark(curIndex);
    endQuizBtn.onclick = ()=>endQuiz();
    navCloseBtn.onclick = ()=>navigatorPanel.classList.add('hidden');
    reviewAnswersBtn.onclick = ()=>reviewAllAnswers();
    restartBtn.onclick = ()=>backHome();

    // anti-cheat: block context menu, copy/paste, keys
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('copy', e => { antiCheatFlags.copies++; e.preventDefault(); toast('Copy blocked (anti-cheat)'); });
    window.addEventListener('cut', e => { antiCheatFlags.copies++; e.preventDefault(); toast('Cut blocked (anti-cheat)'); });
    window.addEventListener('paste', e => { e.preventDefault(); toast('Paste blocked (anti-cheat)'); });

    // block obvious keys like Ctrl+T? We'll prevent Ctrl+Tab detection is not possible; we monitor visibilitychange
    document.addEventListener('keydown', (e)=>{
      if((e.ctrlKey || e.metaKey) && ['c','v','x','u','s'].includes(e.key.toLowerCase())){ e.preventDefault(); toast('Blocked'); }
      if(e.key === 'F11'){ e.preventDefault(); toggleFullscreen(); }
      if(e.key === 'Tab'){ e.preventDefault(); toast('Tab switching is disabled during quiz'); }
    });

    document.addEventListener('visibilitychange', ()=>{
      if(document.hidden && quizScreen.style.display !== 'none' && !quizScreen.classList.contains('hidden')){
        antiCheatFlags.visibilityChanges++;
        pauseQuizForVisibility();
      }
    });
  }

  // small toast
  function toast(msg){
    console.log('TOAST',msg);
    // simple alertless toast:
    const t = document.createElement('div');
    t.textContent = msg; t.style = 'position:fixed;bottom:16px;right:16px;background:#111;color:#fff;padding:8px 12px;border-radius:8px;z-index:9999';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),2200);
  }

  // choose N with shuffle
  function chooseN(arr, n){
    const copy = JSON.parse(JSON.stringify(arr));
    shuffleArray(copy);
    return copy.slice(0,n).map(q=>{
      const qq = JSON.parse(JSON.stringify(q));
      qq.choices = qq.choices.map(c=>({ ...c }));
      return qq;
    });
  }

  function shuffleArray(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} }

  // Start quiz
  function startQuiz({title, questions:qs, settings}){
    if(!qs || qs.length===0) return alert('No questions provided');
    currentQuiz = {
      id: 'local_' + Date.now(),
      title,
      settings,
      questions: qs.map(q=>{
        // prepare runtime fields
        return {
          ...q,
          runtime: {
            selected: [], // choice ids selected by user
            marked: false,
            answered: false,
            timeSpent: 0
          }
        }
      })
    };
    if(settings.shuffleChoices){
      currentQuiz.questions.forEach(q=> shuffleArray(q.choices));
    }
    curIndex = 0;
    timeRemaining = (settings.timerMins || 10) * 60;
    quizStartTs = Date.now();
    antiCheatFlags = {copies:0, visibilityChanges:0};
    showQuizScreen();
    renderQuestion();
    startTimer();
    renderNavigator();
  }

  function showQuizScreen(){
    landing.classList.add('hidden');
    resultScreen.classList.add('hidden');
    quizScreen.classList.remove('hidden');
    quizScreen.style.display = '';
  }

  function renderQuestion(){
    const q = currentQuiz.questions[curIndex];
    qIndex.textContent = curIndex+1;
    qTotal.textContent = currentQuiz.questions.length;
    qText.innerHTML = q.text || '';
    if(q.imageUrl){
      qImage.innerHTML = `<img src="${q.imageUrl}" alt="question image">`;
    } else qImage.innerHTML = '';
    choicesEl.innerHTML = '';
    q.choices.forEach(c=>{
      const div = document.createElement('div');
      div.className = 'choice' + (q.runtime.selected.includes(c.id) ? ' selected' : '');
      div.textContent = c.text;
      div.onclick = ()=>toggleSelect(c.id);
      choicesEl.appendChild(div);
    });
    updateNavItem(curIndex);
  }

  function toggleSelect(choiceId){
    const q = currentQuiz.questions[curIndex];
    // single-select for simplicity; if multiple answers allowed, toggle multiple
    q.runtime.selected = [choiceId];
    q.runtime.answered = true;
    renderQuestion();
    renderNavigator();
  }

  function gotoQuestion(idx){
    if(idx < 0) idx = 0;
    if(idx >= currentQuiz.questions.length) idx = currentQuiz.questions.length - 1;
    curIndex = idx;
    renderQuestion();
  }

  function startTimer(){
    clearInterval(timer);
    paused = false;
    pauseBtn.textContent = 'Pause';
    timer = setInterval(()=>{
      if(!paused){
        timeRemaining--;
        timeLeftEl.textContent = formatTime(timeRemaining);
        // add to current question time
        currentQuiz.questions[curIndex].runtime.timeSpent++;
        if(timeRemaining <= 0){
          clearInterval(timer);
          toast('Time up — auto-submitting');
          finalizeQuiz();
        }
      }
    },1000);
  }

  function togglePause(){
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    if(paused) toast('Quiz paused'); else toast('Quiz resumed');
  }

  function pauseQuizForVisibility(){
    paused = true;
    pauseBtn.textContent = 'Resume';
    toast('You left the tab — paused (anti-cheat logged)');
  }

  function formatTime(sec){
    const m = Math.floor(sec/60).toString().padStart(2,'0');
    const s = (sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function toggleMark(index){
    const q = currentQuiz.questions[index];
    q.runtime.marked = !q.runtime.marked;
    renderNavigator();
    toast(q.runtime.marked ? 'Marked for review' : 'Unmarked');
  }

  function renderNavigator(){
    navigatorGrid.innerHTML = '';
    currentQuiz.questions.forEach((q,i)=>{
      const btn = document.createElement('div');
      btn.className = 'nav-item';
      if(q.runtime.answered) btn.classList.add('answered');
      if(q.runtime.marked) btn.classList.add('marked');
      btn.textContent = i+1;
      btn.onclick = ()=> { gotoQuestion(i); };
      navigatorGrid.appendChild(btn);
    });
  }

  function updateNavItem(i){
    const items = navigatorGrid.children;
    if(items[i]) {
      Array.from(items).forEach(x=>x.classList.remove('current'));
      items[i].classList.add('current');
    }
  }

  function endQuiz(){
    if(confirm('End quiz and submit?')) finalizeQuiz();
  }

  function finalizeQuiz(){
    clearInterval(timer);
    // compute score
    let correct=0, attempted=0;
    const details = currentQuiz.questions.map(q=>{
      const user = q.runtime.selected || [];
      const correctIds = q.answerIds || [];
      const isCorrect = arraysEqual(user, correctIds);
      if(user.length) attempted++;
      if(isCorrect) correct++;
      return {
        id: q.id, text: q.text, choices: q.choices, user, correctIds, isCorrect, imageUrl: q.imageUrl, marked: q.runtime.marked, timeSpent: q.runtime.timeSpent
      }
    });
    const total = currentQuiz.questions.length;
    const percent = Math.round((correct/total)*100);
    const historyEntry = {
      title: currentQuiz.title,
      meta: {
        total, correct, attempted, percent,
        timerUsed: (currentQuiz.settings.timerMins*60) - timeRemaining,
        antiCheat: antiCheatFlags
      },
      results: details
    };
    DB.pushHistory(historyEntry);
    showResults(historyEntry);
  }

  function showResults(entry){
    quizScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    resultScreen.style.display = '';
    resultSummary.innerHTML = `<strong>${entry.title}</strong>
      <p class="muted">Score: ${entry.meta.correct} / ${entry.meta.total} (${entry.meta.percent}%) • Attempted: ${entry.meta.attempted} • Time: ${formatTime(entry.meta.timerUsed)}</p>
      <p class="muted small">Anti-cheat flags: copies=${entry.meta.antiCheat.copies}, visibility=${entry.meta.antiCheat.visibilityChanges}</p>`;
    // compact details
    resultDetails.innerHTML = entry.results.map((r,i)=>`
      <div class="card mt" style="padding:8px">
        <div><strong>Q${i+1}:</strong> ${r.text}</div>
        ${r.imageUrl ? `<img src="${r.imageUrl}" style="max-width:200px;margin-top:8px" />` : ''}
        <div class="muted small">Your answer: ${r.user.join(',') || '—'} • Correct: ${r.correctIds.join(',')}</div>
      </div>
    `).join('');
    // refresh history list
    renderHistory();
  }

  function reviewAllAnswers(){
    // show Q-by-Q review UI: reuse landing area to present full review - for brevity, just show result details (already present)
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function backHome(){
    resultScreen.classList.add('hidden');
    quizScreen.classList.add('hidden');
    landing.classList.remove('hidden');
  }

  function renderHistory(){
    const hist = DB.getHistory();
    if(hist.length===0){ historyList.innerHTML = '<div class="muted small">No history yet</div>'; return;}
    historyList.innerHTML = hist.map(h=>`<div>${new Date(h.timestamp).toLocaleString()} — <strong>${h.title}</strong> • ${h.meta.percent}%</div>`).join('');
  }

  // helpers
  function arraysEqual(a,b){
    if(!a) a=[]; if(!b) b=[];
    if(a.length !== b.length) return false;
    return a.every((v,i)=>v === b[i]);
  }

  function syncQuestionsInPlace(){
    // if DB changed externally, try to update question pool of currentQuiz by id matching
    const currentIds = currentQuiz.questions.map(q=>q.id);
    const fresh = DB.getQuestions();
    currentQuiz.questions = currentQuiz.questions.map(q=>{
      const updated = fresh.find(x=>x.id===q.id);
      return updated ? { ...updated, runtime: q.runtime } : q;
    });
    renderQuestion();
    renderNavigator();
  }

  // Daily quiz generator (simple deterministic seed based)
  function showDailyInfo(){
    const today = (new Date()).toISOString().slice(0,10);
    dailyInfo.textContent = `Daily quiz for ${today}`;
  }

  function startDailyQuiz(){
    // choose 10 random across DB
    const all = DB.getQuestions();
    if(all.length === 0) return alert('No questions in DB');
    const n = Math.min(10, all.length);
    const quizQs = chooseN(all, n);
    startQuiz({ title: 'Daily Quiz', questions: quizQs, settings: { timerMins: 10, shuffleChoices: true } });
  }

  // fullscreen
  function toggleFullscreen(){
    if(!document.fullscreenElement){
      document.documentElement.requestFullscreen().catch(()=>{});
    } else {
      document.exitFullscreen().catch(()=>{});
    }
  }

  // init
  init();

})();
