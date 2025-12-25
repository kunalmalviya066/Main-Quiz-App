/*
============================================
FILE: script.js (FULL – UPDATED WITH ADMIN CRUD + UNDO)
============================================
*/

/* ===============================
   GLOBAL SECURITY & CONFIG
================================ */

let tabSwitchCount = 0;
const MAX_TAB_SWITCHES = 3;
let forceAutoSubmit = false;

const ADMIN_DB_KEY = "quizAppAdminDB";
const MASTER_PASSWORD = "AccessGrant";
const ADMIN_PASSWORD = "Admin@123";
const AUTH_KEY = "quizAppAuthenticated";

/* ===============================
   ADMIN UNDO SYSTEM
================================ */

let adminUndoStack = null;
let adminUndoTimer = null;
const ADMIN_UNDO_TIMEOUT = 30000;

/* ===============================
   APPLICATION STATE
================================ */

const appState = {
    isAuthenticated: localStorage.getItem(AUTH_KEY) === 'true',
    currentView: 'login-gate',
    isQuizActive: false,
    pausedByTabSwitch: false,

    currentQuiz: {
        type: null,
        subject: null,
        topic: null,
        questions: [],
        totalQuestions: 0,
        timerId: null,
        timeLeftSeconds: 0,
        paused: false,
        userAnswers: []
    },

    history: JSON.parse(localStorage.getItem('quizHistory')) || []
};

/* ===============================
   DOM REFERENCES
================================ */

const DOM = {
    appContainer: document.getElementById('app-container'),
    navLinks: document.querySelectorAll('.nav-link'),
    views: document.querySelectorAll('.view'),
    homeOptions: document.querySelectorAll('.home-option-card'),

    loginGate: document.getElementById('login-gate'),
    passwordInput: document.getElementById('password-input'),
    loginButton: document.getElementById('login-button'),
    loginError: document.getElementById('login-error'),

    adminGate: document.getElementById('admin-gate'),
    adminPasswordInput: document.getElementById('admin-password-input'),
    adminLoginButton: document.getElementById('admin-login-button'),
    adminLoginError: document.getElementById('admin-login-error'),
    adminNavLink: document.getElementById('nav-admin'),

    adminPanel: document.getElementById('admin-panel'),
    adminControlsGrid: document.getElementById('admin-controls-grid'),
    showAddQuestionBtn: document.getElementById('show-add-question'),
    showQuestionListBtn: document.getElementById('show-question-list'),
    clearHistoryAdminBtn: document.getElementById('clear-history-admin'),
    adminContentArea: document.getElementById('admin-content-area'),

    subjectSelect: document.getElementById('subject-select'),
    mockSubjectSelect: document.getElementById('mock-subject-select'),
    topicsContainer: document.getElementById('topics-checkbox-container'),
    numQuestions: document.getElementById('num-questions'),
    timerMinutes: document.getElementById('timer-minutes'),

    startSubjectQuiz: document.getElementById('start-subject-quiz'),
    startDailyQuiz: document.getElementById('start-daily-quiz'),
    startMockQuiz: document.getElementById('start-mock-quiz'),

    activeQuizView: document.getElementById('active-quiz'),
    timerDisplay: document.getElementById('timer-display'),
    pauseResumeBtn: document.getElementById('pause-resume-btn'),
    qNumberDisplay: document.getElementById('q-number-display'),
    questionText: document.getElementById('question-text'),
    questionImageContainer: document.getElementById('question-image-container'),
    optionsContainer: document.getElementById('options-container'),

    prevBtn: document.getElementById('prev-question-btn'),
    nextBtn: document.getElementById('next-question-btn'),
    clearAnswerBtn: document.getElementById('clear-answer-btn'),
    markReviewBtn: document.getElementById('mark-review-btn'),
    finishQuizBtn: document.getElementById('finish-quiz-btn'),

    navigatorGrid: document.getElementById('question-navigator-grid'),
    navigatorFinishBtn: document.getElementById('navigator-finish-btn'),

    restrictionModal: document.getElementById('quiz-restriction-modal'),
    cancelQuizBtn: document.getElementById('cancel-quiz-btn'),
    stayQuizBtn: document.getElementById('stay-quiz-btn'),

    pauseOverlay: document.getElementById('pause-screen-overlay'),
    resumeOverlayBtn: document.getElementById('resume-from-overlay-btn'),

    historyList: document.getElementById('history-list'),
    resultDetailsView: document.getElementById('result-details'),
    resultSummaryMetrics: document.getElementById('result-summary-metrics'),
    questionReviewList: document.getElementById('question-review-list'),
    backToSummaryBtn: document.getElementById('back-to-summary-btn')
};

let currentQIndex = 0;

/* ===============================
   CORE HELPERS
================================ */

function persistAdminDB() {
    localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(quizDB));
}

function softDelete(label, snapshot, restoreFn) {
    if (adminUndoTimer) clearTimeout(adminUndoTimer);

    adminUndoStack = { label, snapshot, restoreFn };

    DOM.adminContentArea.insertAdjacentHTML(
        'afterbegin',
        `<div id="admin-undo-banner">
            ⚠️ ${label} deleted
            <button id="undo-admin-action">UNDO</button>
         </div>`
    );

    document.getElementById('undo-admin-action').onclick = () => {
        restoreFn(snapshot);
        adminUndoStack = null;
        document.getElementById('admin-undo-banner')?.remove();
        persistAdminDB();
        renderQuestionList();
    };

    adminUndoTimer = setTimeout(() => {
        adminUndoStack = null;
        document.getElementById('admin-undo-banner')?.remove();
    }, ADMIN_UNDO_TIMEOUT);
}

/* ===============================
   ROUTING
================================ */

function navigateTo(viewId, force = false) {
    if (!appState.isAuthenticated && viewId !== 'login-gate') {
        viewId = 'login-gate';
    }

    if (appState.isQuizActive && !force && viewId !== 'active-quiz') {
        DOM.restrictionModal.classList.remove('hidden');
        return;
    }

    appState.currentView = viewId;
    DOM.views.forEach(v => v.classList.toggle('hidden', v.id !== viewId));
}

/* ===============================
   AUTH
================================ */

function handleLogin() {
    if (DOM.passwordInput.value === MASTER_PASSWORD) {
        appState.isAuthenticated = true;
        localStorage.setItem(AUTH_KEY, 'true');
        navigateTo('home', true);
    } else {
        DOM.loginError.classList.remove('hidden');
        DOM.passwordInput.value = '';
    }
}

function handleAdminLogin() {
    if (DOM.adminPasswordInput.value === ADMIN_PASSWORD) {
        navigateTo('admin-panel', true);
    } else {
        DOM.adminLoginError.classList.remove('hidden');
    }
}
/* ===============================
   TIMER LOGIC
================================ */

function startTimer() {
    if (appState.currentQuiz.timerId) clearInterval(appState.currentQuiz.timerId);

    appState.currentQuiz.paused = false;
    DOM.pauseResumeBtn.innerHTML = 'Pause';

    appState.currentQuiz.timerId = setInterval(() => {
        if (appState.currentQuiz.paused) return;

        appState.currentQuiz.timeLeftSeconds--;
        updateTimerDisplay();

        if (appState.currentQuiz.timeLeftSeconds <= 0) {
            clearInterval(appState.currentQuiz.timerId);
            finishQuiz(true);
        }
    }, 1000);
}

function pauseTimer(byTabSwitch = false) {
    if (appState.currentQuiz.timerId) clearInterval(appState.currentQuiz.timerId);
    appState.currentQuiz.paused = true;
    DOM.pauseResumeBtn.innerHTML = 'Resume';

    if (byTabSwitch) {
        appState.pausedByTabSwitch = true;
        DOM.pauseOverlay.classList.remove('hidden');
    }
}

function updateTimerDisplay() {
    const s = appState.currentQuiz.timeLeftSeconds;
    DOM.timerDisplay.textContent =
        `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/* ===============================
   QUESTION SELECTION
================================ */

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function prepareQuestions(type, params) {
    let shuffled = [];
    let ordered = [];
    const numQ = parseInt(params.numQ);

    if (type === 'subject') {
        const subjectData = quizDB[params.subject];
        params.topics.forEach(topic => {
            const t = subjectData[topic];
            if (!t) return;
            t.shuffle === false ? ordered.push(...t) : shuffled.push(...t);
        });
    } else {
        Object.values(quizDB).forEach(subject =>
            Object.values(subject).forEach(t =>
                t.shuffle === false ? ordered.push(...t) : shuffled.push(...t)
            )
        );
    }

    shuffleArray(shuffled);
    const all = [...ordered, ...shuffled].slice(0, numQ);
    all.forEach((q, i) => q.quizIndex = i + 1);
    return all;
}

function startQuiz(type, params) {
    const qs = prepareQuestions(type, params);
    if (!qs.length) return alert("No questions found.");

    appState.isQuizActive = true;
    currentQIndex = 0;

    appState.currentQuiz = {
        type,
        subject: params.subject || 'Mixed',
        topic: params.topics ? params.topics.join(', ') : 'All',
        questions: qs,
        totalQuestions: qs.length,
        timer: params.timer,
        timeLeftSeconds: params.timer * 60,
        paused: false,
        timerId: null,
        userAnswers: qs.map(q => ({
            id: q.id,
            answer: null,
            markedForReview: false,
            quizIndex: q.quizIndex
        }))
    };

    navigateTo('active-quiz', true);
    startTimer();
    renderQuestion(0);
}

/* ===============================
   RENDER QUESTION
================================ */

function renderQuestion(index) {
    currentQIndex = index;
    const q = appState.currentQuiz.questions[index];
    const ua = appState.currentQuiz.userAnswers[index];

    DOM.qNumberDisplay.textContent =
        `Question ${q.quizIndex} of ${appState.currentQuiz.totalQuestions}`;

    DOM.questionText.innerHTML =
        q.question.replace(/\\n|\n/g, '<br>');

    DOM.questionImageContainer.innerHTML =
        q.image ? `<img src="${q.image}">` : '';

    DOM.optionsContainer.innerHTML = '';
    q.options.forEach(opt => {
        DOM.optionsContainer.innerHTML += `
        <label>
            <input type="radio" name="q-${q.id}"
                value="${opt}"
                ${ua.answer === opt ? 'checked' : ''}
                data-index="${index}">
            ${opt}
        </label>`;
    });

    DOM.prevBtn.disabled = index === 0;
    DOM.nextBtn.disabled = index === appState.currentQuiz.totalQuestions - 1;
}

/* ===============================
   ANSWER HANDLING
================================ */

DOM.optionsContainer.addEventListener('change', e => {
    const i = e.target.dataset.index;
    appState.currentQuiz.userAnswers[i].answer = e.target.value;
});

DOM.prevBtn.onclick = () => renderQuestion(currentQIndex - 1);
DOM.nextBtn.onclick = () => renderQuestion(currentQIndex + 1);

/* ===============================
   FINISH QUIZ
================================ */

function finishQuiz(timeUp = false) {
    if (!forceAutoSubmit && !timeUp && !confirm("Submit quiz?")) return;

    clearInterval(appState.currentQuiz.timerId);

    let correct = 0, attempted = 0;

    const results = appState.currentQuiz.userAnswers.map((ua, i) => {
        const q = appState.currentQuiz.questions[i];
        const isAttempted = ua.answer !== null;
        const isCorrect = ua.answer === q.answer;
        if (isAttempted) attempted++;
        if (isCorrect) correct++;
        return {
            questionText: q.question,
            correctAnswer: q.answer,
            userAnswer: ua.answer,
            explanation: q.explanation,
            isCorrect,
            isAttempted
        };
    });

    const entry = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        subject: appState.currentQuiz.subject,
        score: `${correct}/${appState.currentQuiz.totalQuestions}`,
        correct,
        attempted,
        unattempted: appState.currentQuiz.totalQuestions - attempted,
        results
    };

    appState.history.unshift(entry);
    localStorage.setItem('quizHistory', JSON.stringify(appState.history));

    appState.isQuizActive = false;
    renderResultDetails(entry.id);
    navigateTo('result-details', true);
}

/* ===============================
   RESULT VIEW
================================ */

function renderResultDetails(id) {
    const h = appState.history.find(x => x.id === id);
    if (!h) return;

    DOM.resultSummaryMetrics.innerHTML =
        `<p>Score: ${h.score}</p>`;

    DOM.questionReviewList.innerHTML = '';
    h.results.forEach((r, i) => {
        DOM.questionReviewList.innerHTML += `
        <div>
            <b>Q${i + 1}</b><br>
            ${r.questionText}<br>
            Your: ${r.userAnswer || 'NA'}<br>
            Correct: ${r.correctAnswer}<br>
            ${r.explanation || ''}
        </div>`;
    });
}

/* ===============================
   ANTI-CHEAT
================================ */

document.addEventListener('visibilitychange', () => {
    if (!appState.isQuizActive) return;

    if (document.hidden) {
        tabSwitchCount++;
        if (tabSwitchCount > MAX_TAB_SWITCHES) {
            forceAutoSubmit = true;
            finishQuiz(true);
        } else {
            pauseTimer(true);
            alert(`Tab switch ${tabSwitchCount}/${MAX_TAB_SWITCHES}`);
        }
    }
});

document.addEventListener('contextmenu', e => {
    if (appState.isQuizActive) e.preventDefault();
});

document.addEventListener('copy', e => {
    if (appState.isQuizActive) e.preventDefault();
});

document.addEventListener('paste', e => {
    if (appState.isQuizActive) e.preventDefault();
});

document.addEventListener('fullscreenchange', () => {
    if (appState.isQuizActive && !document.fullscreenElement) {
        finishQuiz(true);
    }
});
/* ===============================
   ADMIN PANEL CORE
================================ */

function loadAdminDB() {
    const saved = localStorage.getItem(ADMIN_DB_KEY);
    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(subject => {
            quizDB[subject] = parsed[subject];
        });
    } catch (e) {
        console.error("Admin DB load failed");
    }
}

/* ===============================
   ADMIN – ADD / EDIT QUESTION
================================ */

function renderAddQuestionForm() {
    const subjects = Object.keys(quizDB);

    DOM.adminContentArea.innerHTML = `
        <h3>Admin Question Manager</h3>

        <input id="new-subject-name" placeholder="New Subject">
        <button id="create-subject-btn">Create Subject</button>
        <button id="delete-subject-btn">Delete Subject</button>

        <hr>

        <form id="add-question-form">
            <select id="new-q-subject">
                <option value="">Select Subject</option>
                ${subjects.map(s => `<option>${s}</option>`).join('')}
            </select>

            <select id="new-q-topic">
                <option value="">Select Topic</option>
            </select>

            <input id="new-topic-name" placeholder="New Topic">
            <label>
                <input type="checkbox" id="new-topic-non-shuffle">
                Non-Shuffling Topic
            </label>
            <button type="button" id="create-topic-btn">Create Topic</button>
            <button type="button" id="delete-topic-btn">Delete Topic</button>

            <textarea id="new-q-text" placeholder="Question"></textarea>
            <input id="opt-a" placeholder="Option A">
            <input id="opt-b" placeholder="Option B">
            <input id="opt-c" placeholder="Option C">
            <input id="opt-d" placeholder="Option D">
            <input id="new-q-answer" placeholder="Correct Answer">
            <textarea id="new-q-explanation" placeholder="Explanation"></textarea>
            <input id="new-q-image" placeholder="Image URL">

            <button type="submit">Save Question</button>
        </form>
    `;

    const subjectSel = document.getElementById('new-q-subject');
    const topicSel = document.getElementById('new-q-topic');

    subjectSel.onchange = () => {
        topicSel.innerHTML = '<option>Select Topic</option>';
        Object.keys(quizDB[subjectSel.value] || {}).forEach(t => {
            topicSel.innerHTML += `<option>${t}</option>`;
        });
    };

    /* SUBJECT CREATE */
    document.getElementById('create-subject-btn').onclick = () => {
        const name = document.getElementById('new-subject-name').value.trim();
        if (!name || quizDB[name]) return alert("Invalid subject");
        quizDB[name] = {};
        persistAdminDB();
        renderAddQuestionForm();
    };

    /* SUBJECT DELETE (UNDO SAFE) */
    document.getElementById('delete-subject-btn').onclick = () => {
        if (appState.isQuizActive) return alert("Quiz active");
        const s = subjectSel.value;
        if (!s) return alert("Select subject");

        const snapshot = JSON.parse(JSON.stringify(quizDB[s]));
        delete quizDB[s];
        persistAdminDB();

        softDelete(
            `Subject ${s}`,
            { s, snapshot },
            d => quizDB[d.s] = d.snapshot
        );

        renderAddQuestionForm();
    };

    /* TOPIC CREATE */
    document.getElementById('create-topic-btn').onclick = () => {
        const s = subjectSel.value;
        const t = document.getElementById('new-topic-name').value.trim();
        if (!s || !t || quizDB[s][t]) return alert("Invalid topic");

        quizDB[s][t] = [];
        if (document.getElementById('new-topic-non-shuffle').checked) {
            quizDB[s][t].shuffle = false;
        }

        persistAdminDB();
        subjectSel.onchange();
    };

    /* TOPIC DELETE (UNDO SAFE) */
    document.getElementById('delete-topic-btn').onclick = () => {
        if (appState.isQuizActive) return alert("Quiz active");

        const s = subjectSel.value;
        const t = topicSel.value;
        if (!s || !t) return alert("Select topic");

        const snapshot = JSON.parse(JSON.stringify(quizDB[s][t]));
        delete quizDB[s][t];
        persistAdminDB();

        softDelete(
            `Topic ${t}`,
            { s, t, snapshot },
            d => quizDB[d.s][d.t] = d.snapshot
        );

        subjectSel.onchange();
    };

    /* QUESTION SAVE */
    document.getElementById('add-question-form').onsubmit = e => {
        e.preventDefault();

        const s = subjectSel.value;
        const t = topicSel.value;
        if (!s || !t) return alert("Select subject & topic");

        let maxId = 0;
        Object.values(quizDB).forEach(sub =>
            Object.values(sub).forEach(arr =>
                arr.forEach(q => maxId = Math.max(maxId, q.id || 0))
            )
        );

        quizDB[s][t].push({
            id: maxId + 1,
            question: document.getElementById('new-q-text').value,
            options: [
                optA = document.getElementById('opt-a').value,
                optB = document.getElementById('opt-b').value,
                optC = document.getElementById('opt-c').value,
                optD = document.getElementById('opt-d').value
            ],
            answer: document.getElementById('new-q-answer').value,
            explanation: document.getElementById('new-q-explanation').value,
            image: document.getElementById('new-q-image').value || null
        });

        persistAdminDB();
        alert("Question saved");
    };
}

/* ===============================
   ADMIN – QUESTION LIST
================================ */

function renderQuestionList() {
    DOM.adminContentArea.innerHTML = '<h3>All Questions</h3>';
    Object.entries(quizDB).forEach(([s, sub]) => {
        Object.entries(sub).forEach(([t, arr]) => {
            arr.forEach(q => {
                const div = document.createElement('div');
                div.innerHTML = `
                    <b>${s} → ${t}</b> [${q.id}]
                    <button data-s="${s}" data-t="${t}" data-id="${q.id}">Delete</button>
                `;
                div.querySelector('button').onclick = e => {
                    if (appState.isQuizActive) return alert("Quiz active");

                    const snap = q;
                    quizDB[s][t] = quizDB[s][t].filter(x => x.id !== q.id);
                    persistAdminDB();

                    softDelete(
                        `Question ${q.id}`,
                        { s, t, snap },
                        d => quizDB[d.s][d.t].push(d.snap)
                    );

                    renderQuestionList();
                };
                DOM.adminContentArea.appendChild(div);
            });
        });
    });
}

/* ===============================
   ADMIN – CLEAR HISTORY
================================ */

function handleClearHistoryAdmin() {
    if (!confirm("Delete ALL history?")) return;
    localStorage.removeItem('quizHistory');
    appState.history = [];
    alert("History cleared");
}

/* ===============================
   EVENT LISTENERS
================================ */

function setupEventListeners() {
    DOM.loginButton.onclick = handleLogin;
    DOM.adminLoginButton.onclick = handleAdminLogin;

    DOM.showAddQuestionBtn.onclick = renderAddQuestionForm;
    DOM.showQuestionListBtn.onclick = renderQuestionList;
    DOM.clearHistoryAdminBtn.onclick = handleClearHistoryAdmin;

    DOM.backToSummaryBtn.onclick = () => navigateTo('result-summary', true);
}

/* ===============================
   INITIALIZATION
================================ */

function initApp() {
    loadAdminDB();
    setupEventListeners();
    navigateTo(appState.isAuthenticated ? 'home' : 'login-gate', true);
}

initApp();
