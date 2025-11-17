/* script.js
   Main Public UI Logic
   Handles routing, subject/topic selection, custom mock builder,
   daily quiz, quiz engine, results, history, anti-cheat, fullscreen.
*/

(async function () {
  'use strict';

  await DB.init();

  const app = document.getElementById('app');

  // ----------------------- ROUTER -----------------------
  window.addEventListener('hashchange', render);
  render();

  function render() {
    const hash = location.hash.replace('#', '') || 'home';
    switch (hash) {
      case 'home': return showHome();
      case 'subjects': return showSubjects();
      case 'topics': return showTopics();
      case 'daily': return startDailyQuiz();
      case 'mock': return showMockBuilder();
      case 'help': return showHelp();
      default: return showHome();
    }
  }

  // ----------------------- HOME -----------------------
  function showHome() {
    app.innerHTML = `
      <div class="card">
        <h2>Welcome!</h2>
        <p>Select a section from the header to begin.</p>
      </div>`;
  }

  // ----------------------- SUBJECT LIST -----------------------
  function showSubjects() {
    const subjects = DB.listSubjects();
    app.innerHTML = `
      <div class="card">
        <h2>Subjects</h2>
        <div class="grid grid-2">
          ${subjects.map(s => `<div class="card">${s.name}</div>`).join('')}
        </div>
      </div>`;
  }

  // ----------------------- TOPICS -----------------------
  function showTopics() {
    const subs = DB.listSubjects();
    const topics = DB.listTopics();
    app.innerHTML = `
      <div class="card">
        <h2>Topics</h2>
        <div class="grid grid-2">
          ${topics.map(t => {
            const s = subs.find(x => x.id === t.subjectId);
            return `<div class="card"><strong>${t.name}</strong><br><small>${s ? s.name : ''}</small></div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // ----------------------- DAILY QUIZ -----------------------
  async function startDailyQuiz() {
    const qs = DB.getDailyQuestions(10);
    startQuizSession({ questions: qs, title: 'Daily Quiz', timeLimitSec: 600 });
  }

  // ----------------------- MOCK TEST BUILDER -----------------------
  function showMockBuilder() {
    const subs = DB.listSubjects();
    const topics = DB.listTopics();
    app.innerHTML = `
      <div class="card">
        <h2>Custom Mock Test</h2>
        <label>Select Subjects</label>
        <select id="mockSubs" multiple>
          ${subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select>

        <label>Select Topics</label>
        <select id="mockTopics" multiple>
          ${topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
        </select>

        <label>Number of Questions</label>
        <input id="mockCount" type="number" min="1" />

        <label>Timer (minutes)</label>
        <input id="mockTimer" type="number" min="1" />

        <button class="btn" id="startMock">Start Test</button>
      </div>`;

    document.getElementById('startMock').onclick = () => {
      const sIds = [...document.getElementById('mockSubs').selectedOptions].map(o => o.value);
      const tIds = [...document.getElementById('mockTopics').selectedOptions].map(o => o.value);
      const count = Number(document.getElementById('mockCount').value);
      const mins = Number(document.getElementById('mockTimer').value);

      if (!sIds.length || !tIds.length) return alert('Select at least one subject and topic');
      if (count < 1) return alert('Invalid question count');
      if (mins < 1) return alert('Invalid timer');

      let pool = DB.listQuestions().filter(q => sIds.includes(q.subjectId) && tIds.includes(q.topicId));
      if (pool.length < count) return alert('Not enough questions in the selected filters');

      pool = Utils.shuffle(pool).slice(0, count);
      startQuizSession({ questions: pool, title: 'Custom Mock', timeLimitSec: mins * 60 });
    };
  }

  // ----------------------- HELP -----------------------
  function showHelp() {
    app.innerHTML = `
      <div class="card">
        <h2>Help</h2>
        <p>This is a quiz platform with subjects, topics, mock tests, and daily quizzes.</p>
      </div>`;
  }

  // ----------------------- QUIZ SESSION -----------------------
  function startQuizSession({ questions, title, timeLimitSec }) {
    const state = {
      title,
      idx: 0,
      questions: questions.map(q => ({ ...q, shuffledChoices: Utils.shuffle(q.choices) })),
      answers: {},
      marked: {},
      paused: false,
      remaining: timeLimitSec,
      start: Date.now()
    };

    let timerInt = setInterval(() => {
      if (!state.paused) state.remaining--;
      if (state.remaining <= 0) finish();
      updateTimer();
    }, 1000);

    renderQuiz();

    function renderQuiz() {
      const q = state.questions[state.idx];
      app.innerHTML = `
        <div class="quiz-container">
          <h2>${state.title}</h2>
          <div>Time: <span id="timer">${Utils.formatTime(state.remaining)}</span></div>
          <hr>
          <h3>Q${state.idx + 1}. ${q.question}</h3>
          ${q.image ? `<img src="${q.image}" style="max-width:100%;margin:1rem 0;">` : ''}
          <div>
            ${q.shuffledChoices.map((c, i) => `
              <div class="choice ${state.answers[q.id] === i ? 'selected' : ''}" data-i="${i}">${c}</div>
            `).join('')}
          </div>
          <div class="navigator">
            ${state.questions.map((_, i) => {
              const attempted = state.answers[state.questions[i].id] !== undefined;
              const rev = state.marked[state.questions[i].id];
              return `<div class="nav-btn ${attempted ? 'attempted' : ''} ${rev ? 'review' : ''}" data-nav="${i}">${i + 1}</div>`;
            }).join('')}
          </div>

          <div class="grid grid-3">
            <button class="btn" id="prevBtn">Prev</button>
            <button class="btn btn-light" id="markBtn">Mark/Unmark</button>
            <button class="btn" id="nextBtn">Next</button>
          </div>

          <div style="margin-top:1rem;">
            <button class="btn" id="pauseBtn">${state.paused ? 'Resume' : 'Pause'}</button>
            <button class="btn btn-light" id="finishBtn">Finish</button>
            <button class="btn" id="fullBtn">Fullscreen</button>
          </div>
        </div>`;

      // handlers
      document.querySelectorAll('.choice').forEach(ch => {
        ch.onclick = () => {
          const idx = Number(ch.dataset.i);
          state.answers[q.id] = idx;
          renderQuiz();
        }
      });

      document.querySelectorAll('.nav-btn').forEach(nb => {
        nb.onclick = () => {
          state.idx = Number(nb.dataset.nav);
          renderQuiz();
        }
      });

      document.getElementById('prevBtn').onclick = () => {
        if (state.idx > 0) { state.idx--; renderQuiz(); }
      };
      document.getElementById('nextBtn').onclick = () => {
        if (state.idx < state.questions.length - 1) { state.idx++; renderQuiz(); }
      };
      document.getElementById('markBtn').onclick = () => {
        const id = q.id;
        state.marked[id] = !state.marked[id];
        renderQuiz();
      };
      document.getElementById('pauseBtn').onclick = () => {
        state.paused = !state.paused;
        renderQuiz();
      };
      document.getElementById('finishBtn').onclick = () => finish();
      document.getElementById('fullBtn').onclick = toggleFullscreen;

      Utils.applyAntiCheat(app);
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else document.exitFullscreen();
    }

    function updateTimer() {
      const el = document.getElementById('timer');
      if (el) el.textContent = Utils.formatTime(state.remaining);
    }

    function finish() {
      clearInterval(timerInt);
      showResult();
    }

    function showResult() {
      const qs = state.questions;
      let correct = 0, attempted = 0;
      qs.forEach(q => {
        const idx = state.answers[q.id];
        if (idx !== undefined) {
          attempted++;
          const correctChoice = q.choices[q.answerIndex];
          const selectedChoice = q.shuffledChoices[idx];
          if (selectedChoice === correctChoice) correct++;
        }
      });

      const accuracy = attempted ? Math.round((correct / attempted) * 100) : 0;
      const duration = (Date.now() - state.start) / 1000;

      DB.recordUserHistory({
        type: state.title,
        subjectIds: [...new Set(qs.map(q => q.subjectId))],
        topicIds: [...new Set(qs.map(q => q.topicId))],
        questionCount: qs.length,
        timeLimitSec: state.remaining,
        score: correct,
        attempted,
        accuracy,
        durationSec: duration,
        answers: Object.entries(state.answers).map(([qid, idx]) => ({
          questionId: qid,
          selectedIndex: idx,
          isCorrect: (() => {
            const q = qs.find(qq => qq.id === qid);
            if (!q) return false;
            return q.shuffledChoices[idx] === q.choices[q.answerIndex];
          })(),
          marked: state.marked[qid] || false
        }))
      });

      app.innerHTML = `
        <div class="card">
          <h2>Results</h2>
          <p>Score: ${correct}/${qs.length}</p>
          <p>Attempted: ${attempted}</p>
          <p>Accuracy: ${accuracy}%</p>
          <p>Time Taken: ${Utils.formatTime(duration)}</p>
          <hr>
          <h3>Review</h3>
          ${qs.map(q => {
            const chosenIdx = state.answers[q.id];
            const chosen = chosenIdx !== undefined ? q.shuffledChoices[chosenIdx] : '—';
            const correctAns = q.choices[q.answerIndex];
            return `
              <div class="card" style="margin:1rem 0;">
                <h4>${q.question}</h4>
                ${q.image ? `<img src="${q.image}" style="max-width:100%;margin:1rem 0;">` : ''}
                <p><strong>Your Answer:</strong> ${chosen}</p>
                <p><strong>Correct:</strong> ${correctAns}</p>
                <p><em>${q.explanation || ''}</em></p>
              </div>`;
          }).join('')}
        </div>`;
    }
  }
})();