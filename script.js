/* script.js
   Handles user-facing UI: subject/topic selection, test builder, quiz engine, daily quiz, results, and history.
   Depends on db.js (QA_DB).
*/

(function(){
  // --- Helpers ---
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function el(tag, cls, html){ const e = document.createElement(tag); if(cls) e.className = cls; if(html!==undefined) e.innerHTML = html; return e; }
  function fmtTime(s){
    const hh = String(Math.floor(s/3600)).padStart(2,'0');
    const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }

  // --- App State ---
  const state = {
    selectedSubjects: [],
    selectedTopics: [],
    currentTest: null, // {questions:[], answers:[], flags:[], meta:{title,...}, timerSecs, remaining, paused, startTime}
    antiCheat: { tabSwitches: 0, blockedActions: 0 }
  };

  // --- DOM nodes ---
  const sections = {
    home: $('#home'),
    subjectSelection: $('#subject-selection'),
    topicSelection: $('#topic-selection'),
    builder: $('#builder'),
    quizArea: $('#quiz-area'),
    results: $('#results'),
    history: $('#history'),
    help: $('#help')
  };

  // Nav
  $('#nav-home').addEventListener('click', ()=>showSection('home'));
  $('#nav-subjects').addEventListener('click', ()=>showSection('subjectSelection'));
  $('#nav-topics').addEventListener('click', ()=>showSection('topicSelection'));
  $('#nav-daily').addEventListener('click', startDailyQuiz);
  $('#nav-fullmock').addEventListener('click', ()=>{ showSection('subjectSelection'); });
  $('#nav-help').addEventListener('click', ()=>showSection('help'));

  $('#start-practice').addEventListener('click', ()=>showSection('subjectSelection'));
  $('#try-daily').addEventListener('click', startDailyQuiz);
  $('#back-home').addEventListener('click', ()=>showSection('home'));
  $('#help-home').addEventListener('click', ()=>showSection('home'));

  // subject selection
  function renderSubjects(){
    const list = $('#subject-list');
    list.innerHTML = '';
    const subjects = QA_DB.getSubjects();
    subjects.forEach(s=>{
      const card = el('label','card subject-card');
      card.innerHTML = `<input type="checkbox" data-id="${s.id}" /> <strong>${s.name}</strong><div class="muted">${s.desc||''}</div>`;
      card.querySelector('input').addEventListener('change', (ev)=>{
        const id = ev.target.dataset.id;
        if(ev.target.checked){
          if(!state.selectedSubjects.includes(id)) state.selectedSubjects.push(id);
        } else {
          state.selectedSubjects = state.selectedSubjects.filter(x=>x!==id);
        }
      });
      list.appendChild(card);
    });
  }

  $('#to-topic-select').addEventListener('click', ()=>{
    if(state.selectedSubjects.length===0){
      // auto-select all if none chosen
      state.selectedSubjects = QA_DB.getSubjects().map(s=>s.id);
    }
    renderTopics();
    showSection('topicSelection');
  });

  $('#back-to-subjects').addEventListener('click', ()=>{ showSection('subjectSelection'); });

  function renderTopics(){
    const list = $('#topic-list');
    list.innerHTML = '';
    const topics = QA_DB.getTopics();
    // Preselect topics that belong to selectedSubjects
    topics.forEach(t=>{
      const shouldShow = state.selectedSubjects.length===0 || state.selectedSubjects.includes(t.subjectId);
      if(!shouldShow) return;
      const card = el('label','card topic-card');
      card.innerHTML = `<input type="checkbox" data-id="${t.id}" /> <strong>${t.name}</strong> <div class="muted">Subject: ${QA_DB.findSubject(t.subjectId).name}</div>`;
      card.querySelector('input').addEventListener('change',(ev)=>{
        const id = ev.target.dataset.id;
        if(ev.target.checked){
          if(!state.selectedTopics.includes(id)) state.selectedTopics.push(id);
        } else {
          state.selectedTopics = state.selectedTopics.filter(x=>x!==id);
        }
      });
      list.appendChild(card);
    });
  }

  // builder actions
  $('#to-builder').addEventListener('click', ()=>{
    // if no topics selected => select all for chosen subjects
    if(state.selectedTopics.length===0){
      const topics = QA_DB.getTopics();
      state.selectedTopics = topics.filter(t=>state.selectedSubjects.includes(t.subjectId)).map(t=>t.id);
    }
    showSection('builder');
  });

  $('#builder-back').addEventListener('click', ()=>showSection('topicSelection'));
  $('#start-custom-test').addEventListener('click', startCustomTest);

  // --- Daily quiz logic ---
  function startDailyQuiz(){
    // Daily key by date
    const today = (new Date()).toISOString().slice(0,10);
    const key = 'quizlab_daily_' + today;
    let saved = localStorage.getItem(key);
    if(saved){
      const test = JSON.parse(saved);
      startTestFromPreset(test);
      return;
    }
    // generate 10 random questions from selected or all
    const allQ = QA_DB.getQuestions();
    const pool = allQ.slice();
    QA_DB.shuffleArray(pool);
    const chosen = pool.slice(0,10);
    const test = {
      title: `Daily Quiz — ${today}`,
      questions: chosen,
      timerSecs: 10*60
    };
    localStorage.setItem(key, JSON.stringify(test));
    startTestFromPreset(test);
  }

  // --- Custom test builder start ---
  function startCustomTest(){
    const num = parseInt($('#num-questions').value,10) || 10;
    const minutes = parseInt($('#timer-minutes').value,10) || 30;
    const shuffleChoices = $('#shuffle-choices').checked;

    // build pool based on selected subjects/topics
    const subjectIds = state.selectedSubjects.length ? state.selectedSubjects : QA_DB.getSubjects().map(s=>s.id);
    const topicIds = state.selectedTopics.length ? state.selectedTopics : QA_DB.getTopics().filter(t=>subjectIds.includes(t.subjectId)).map(t=>t.id);

    let pool = QA_DB.getQuestions({subjectIds, topicIds});
    if(pool.length===0){
      alert('No questions available for selected subjects/topics. Visit Admin to add questions.');
      return;
    }
    QA_DB.shuffleArray(pool);
    const chosen = pool.slice(0, Math.min(num, pool.length)).map(q=>{
      // copy and maybe shuffle choices
      const copy = JSON.parse(JSON.stringify(q));
      if(shuffleChoices){
        const mapping = copy.choices.map((c,i)=>i);
        QA_DB.shuffleArray(mapping);
        copy._choiceOrder = mapping; // store mapping of new order indices
        copy.choices = mapping.map(i=>copy.choices[i]);
        // remap answer index to new index
        copy.answer = mapping.indexOf(q.answer);
      }
      return copy;
    });

    const test = {
      title: `Custom Test (${chosen.length} q)`,
      questions: chosen,
      timerSecs: minutes*60
    };
    startTestFromPreset(test);
  }

  // --- Start test common flow ---
  function startTestFromPreset(preset){
    const questions = preset.questions.map(q=>({ ...q }));
    const answers = new Array(questions.length).fill(null);
    const flags = new Array(questions.length).fill(false);
    state.currentTest = {
      questions,
      answers,
      flags,
      meta: { title: preset.title || 'Test' },
      timerSecs: preset.timerSecs || 0,
      remaining: preset.timerSecs || 0,
      paused: false,
      startTime: Date.now(),
      violations: 0
    };
    renderQuiz();
    showSection('quizArea');
    initAntiCheat();
  }

  // --- Quiz rendering & navigation ---
  let currentIndex = 0;
  let timerInterval = null;

  function renderQuiz(){
    if(!state.currentTest) return;
    currentIndex = 0;
    $('#quiz-title').textContent = state.currentTest.meta.title;
    $('#quiz-meta').textContent = `${state.currentTest.questions.length} questions • Timer: ${Math.ceil(state.currentTest.timerSecs/60)} min`;
    renderNavigator();
    renderQuestion(currentIndex);
    startTimer();
  }

  function renderNavigator(){
    const grid = $('#nav-grid');
    grid.innerHTML = '';
    state.currentTest.questions.forEach((q, idx)=>{
      const btn = document.createElement('button');
      btn.textContent = idx+1;
      if(state.currentTest.answers[idx] !== null) btn.classList.add('answered');
      if(state.currentTest.flags[idx]) btn.classList.add('marked');
      if(idx === currentIndex) btn.classList.add('current');
      btn.addEventListener('click', ()=>{ goToQuestion(idx); });
      grid.appendChild(btn);
    });
    $('#nav-summary').textContent = `${state.currentTest.answers.filter(a=>a!==null).length} / ${state.currentTest.questions.length}`;
  }

  function renderQuestion(i){
    currentIndex = i;
    const q = state.currentTest.questions[i];
    const container = $('#question-card');
    container.innerHTML = '';
    const qnum = el('div','question',`<strong>Q${i+1}.</strong> ${q.text}`);
    container.appendChild(qnum);
    if(q.image){
      const img = el('img','',null);
      img.src = q.image;
      container.appendChild(img);
    }
    const choices = el('div','choices');
    q.choices.forEach((choice, cidx)=>{
      const ch = el('div','choice', choice);
      ch.dataset.index = cidx;
      if(state.currentTest.answers[i] === cidx) ch.classList.add('selected');
      ch.addEventListener('click', ()=>{
        state.currentTest.answers[i] = cidx;
        renderNavigator();
        renderQuestion(i); // re-render to update selection
      });
      choices.appendChild(ch);
    });
    container.appendChild(choices);

    // footer
    const footer = el('div','question-footer');
    const status = el('div','muted', `Marked: ${state.currentTest.flags[i] ? 'Yes' : 'No'}`);
    const qinfo = el('div','muted', `Question ${i+1} of ${state.currentTest.questions.length}`);
    footer.appendChild(status);
    footer.appendChild(qinfo);
    container.appendChild(footer);

    // update nav highlight
    $$('#nav-grid button').forEach((b,idx)=> b.classList.toggle('current', idx===i));
  }

  function goToQuestion(idx){
    if(idx<0 || idx>= state.currentTest.questions.length) return;
    renderQuestion(idx);
  }

  $('#next-q').addEventListener('click', ()=> {
    if(currentIndex < state.currentTest.questions.length - 1) {
      goToQuestion(currentIndex + 1);
    }
  });
  $('#prev-q').addEventListener('click', ()=> {
    if(currentIndex > 0) goToQuestion(currentIndex - 1);
  });

  $('#mark-review').addEventListener('click', ()=>{
    state.currentTest.flags[currentIndex] = !state.currentTest.flags[currentIndex];
    renderNavigator();
    renderQuestion(currentIndex);
  });

  $('#clear-answer').addEventListener('click', ()=>{
    state.currentTest.answers[currentIndex] = null;
    renderNavigator();
    renderQuestion(currentIndex);
  });

  // --- Timer and pause/resume ---
  function startTimer(){
    stopTimer();
    if(state.currentTest.timerSecs <= 0) {
      $('#timer').textContent = 'No timer';
      return;
    }
    state.currentTest.remaining = state.currentTest.remaining || state.currentTest.timerSecs;
    updateTimerUI();
    timerInterval = setInterval(()=>{
      if(!state.currentTest || state.currentTest.paused) return;
      if(state.currentTest.remaining > 0){
        state.currentTest.remaining--;
        updateTimerUI();
        if(state.currentTest.remaining === 0){
          finishTest('timeup');
        }
      }
    }, 1000);
  }
  function stopTimer(){ if(timerInterval) { clearInterval(timerInterval); timerInterval = null; } }
  function updateTimerUI(){
    $('#timer').textContent = fmtTime(state.currentTest.remaining);
  }
  $('#pause-resume').addEventListener('click', ()=>{
    if(!state.currentTest) return;
    state.currentTest.paused = !state.currentTest.paused;
    $('#pause-resume').textContent = state.currentTest.paused ? 'Resume' : 'Pause';
    if(!state.currentTest.paused) startTimer();
  });

  // --- Fullscreen ---
  $('#toggle-fullscreen').addEventListener('click', ()=>{
    const el = document.documentElement;
    if(!document.fullscreenElement) el.requestFullscreen().catch(()=>{});
    else document.exitFullscreen();
  });

  // --- End/Finsih test ---
  $('#end-test').addEventListener('click', ()=>{
    if(confirm('End this test and submit?')) finishTest('user');
  });

  function finishTest(reason){
    stopTimer();
    const test = state.currentTest;
    const total = test.questions.length;
    let correct = 0, attempted = 0;
    const review = [];
    test.questions.forEach((q, i)=>{
      const ans = test.answers[i];
      if(ans !== null && ans !== undefined) attempted++;
      const isCorrect = ans === q.answer;
      if(isCorrect) correct++;
      review.push({
        index: i+1,
        question: q,
        selected: ans,
        correct: q.answer,
        isCorrect
      });
    });
    const score = Math.round((correct/total)*100);
    const accuracy = attempted ? Math.round((correct/attempted)*100) : 0;
    const timeTaken = Math.max(0, Math.round((Date.now() - test.startTime)/1000));
    const record = {
      id: 'att_' + Date.now(),
      title: test.meta.title,
      timestamp: (new Date()).toISOString(),
      total,
      correct,
      attempted,
      score,
      accuracy,
      timeTaken,
      review
    };
    QA_DB.saveAttempt(record);
    renderResults(record);
    state.currentTest = null;
    currentIndex = 0;
    stopAntiCheat();
    showSection('results');
  }

  // render results
  function renderResults(record){
    const sum = $('#result-summary');
    sum.innerHTML = `
      <h3>${record.title}</h3>
      <p class="muted">Taken: ${new Date(record.timestamp).toLocaleString()}</p>
      <div class="stack">
        <div class="card"><strong>Score:</strong> ${record.score}% (${record.correct}/${record.total})</div>
        <div class="card"><strong>Attempted:</strong> ${record.attempted}/${record.total}</div>
        <div class="card"><strong>Accuracy:</strong> ${record.accuracy}%</div>
        <div class="card"><strong>Time taken:</strong> ${fmtTime(record.timeTaken)}</div>
      </div>
    `;
    const reviewList = $('#review-list');
    reviewList.innerHTML = '<h3>Question-by-question review</h3>';
    record.review.forEach(r=>{
      const card = el('div','card');
      const qtxt = `<strong>Q${r.index}.</strong> ${r.question.text}`;
      let choicesHtml = '<div class="choices">';
      r.question.choices.forEach((c,idx)=>{
        const cls = idx === r.correct ? 'choice correct' : (idx === r.selected ? 'choice wrong' : 'choice');
        choicesHtml += `<div class="${cls}">${c}</div>`;
      });
      choicesHtml += '</div>';
      card.innerHTML = `${qtxt}${r.question.image ? `<img src="${r.question.image}" />` : ''}${choicesHtml}<div class="muted">Selected: ${r.selected===null? 'None': r.question.choices[r.selected]} | Correct: ${r.question.choices[r.correct]}</div>`;
      reviewList.appendChild(card);
    });
  }

  $('#results-home').addEventListener('click', ()=> showSection('home'));
  $('#results-history').addEventListener('click', ()=> showHistory());

  // history
  function showHistory(){
    const arr = QA_DB.getHistory().reverse();
    const list = $('#history-list');
    list.innerHTML = '';
    if(arr.length===0) list.innerHTML = '<div class="muted">No prior attempts</div>';
    arr.forEach(a=>{
      const card = el('div','card');
      card.innerHTML = `<strong>${a.title}</strong><div class="muted">${new Date(a.timestamp).toLocaleString()}</div>
        <div>Score: ${a.score}% • ${a.correct}/${a.total} • Time: ${fmtTime(a.timeTaken)}</div>
        <div style="margin-top:8px"><button class="btn view" data-id="${a.id}">View</button></div>`;
      card.querySelector('.view').addEventListener('click', ()=> renderResults(a) || showSection('results'));
      list.appendChild(card);
    });
    showSection('history');
  }
  $('#history-home').addEventListener('click', ()=> showSection('home'));

  // --- Anti-cheat ---
  let visibilityHandler = null;
  let blurHandler = null;
  function initAntiCheat(){
    // block copy/paste & right-click
    document.addEventListener('copy', preventAction);
    document.addEventListener('paste', preventAction);
    document.addEventListener('contextmenu', preventAction);
    // detect tab switching
    visibilityHandler = ()=>{
      if(document.hidden){
        state.antiCheat.tabSwitches++;
        state.currentTest && (state.currentTest.violations = (state.currentTest.violations||0)+1);
        if(state.currentTest && state.currentTest.violations >= 3){
          alert('Too many tab switches detected. Test will be submitted for integrity.');
          finishTest('anti-cheat');
        }
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
    // blur detection (window)
    blurHandler = ()=>{
      state.antiCheat.tabSwitches++;
      if(state.currentTest && state.currentTest.violations >= 3){
        alert('Too many switches. Ending test.');
        finishTest('anti-cheat');
      }
    };
    window.addEventListener('blur', blurHandler);
    // beforeunload
    window.addEventListener('beforeunload', beforeUnloadHandler);
  }
  function stopAntiCheat(){
    document.removeEventListener('copy', preventAction);
    document.removeEventListener('paste', preventAction);
    document.removeEventListener('contextmenu', preventAction);
    if(visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
    if(blurHandler) window.removeEventListener('blur', blurHandler);
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  }
  function preventAction(e){
    e.preventDefault();
    state.antiCheat.blockedActions++;
    if(state.currentTest){
      state.currentTest.violations = (state.currentTest.violations||0)+1;
      if(state.currentTest.violations >= 5){
        alert('Too many suspicious actions detected. Test submitted.');
        finishTest('anti-cheat');
      }
    }
    return false;
  }
  function beforeUnloadHandler(e){
    if(state.currentTest){
      e.preventDefault();
      e.returnValue = 'Test running — leaving will submit progress.'; // show warning
      return e.returnValue;
    }
  }

  // --- UI routing ---
  function showSection(name){
    Object.keys(sections).forEach(k=>{
      if(k === name) sections[k].classList.remove('hidden');
      else sections[k].classList.add('hidden');
    });
    window.scrollTo(0,0);
    if(name === 'subjectSelection') renderSubjects();
  }

  // init
  showSection('home');

  // Expose minimal debug to console
  window.QuizLabState = state;

})();
