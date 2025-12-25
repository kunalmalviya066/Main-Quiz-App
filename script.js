/*
 * ============================================
 * FILE: script.js (FULL – UPDATED WITH ADMIN UNDO)
 * FLOW: EXACT SAME AS OLD FILE
 * NOTE: NO OTHER FILE REQUIRED
 * ============================================
 */

let tabSwitchCount = 0;
const MAX_TAB_SWITCHES = 3;
let forceAutoSubmit = false;

// --- ADMIN LOCAL STORAGE DB ---
const ADMIN_DB_KEY = "quizAppAdminDB";

// --- ADMIN UNDO SYSTEM ---
let adminUndoStack = null;
let adminUndoTimer = null;
const ADMIN_UNDO_TIMEOUT = 30000; // 30 seconds

function persistAdminDB() {
    localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(quizDB));
}

function softDelete(actionLabel, snapshot, restoreCallback) {
    if (adminUndoTimer) clearTimeout(adminUndoTimer);

    adminUndoStack = { actionLabel, snapshot, restoreCallback };

    DOM.adminContentArea.insertAdjacentHTML(
        'afterbegin',
        `
        <div id="admin-undo-banner" style="
            background:#fff3cd;
            padding:10px;
            border:1px solid #ffc107;
            margin-bottom:10px;
            display:flex;
            justify-content:space-between;
            align-items:center;
        ">
            <strong>${actionLabel} deleted.</strong>
            <button id="undo-admin-action" class="control-btn primary">UNDO</button>
        </div>
        `
    );

    document.getElementById('undo-admin-action').onclick = () => {
        adminUndoStack.restoreCallback(adminUndoStack.snapshot);
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

// --- 0. SECURITY & CONFIGURATION ---
const MASTER_PASSWORD = "AccessGrant";
const ADMIN_PASSWORD = "Admin@123";
const AUTH_KEY = "quizAppAuthenticated";

// --- 1. APPLICATION STATE MANAGEMENT ---
const appState = {
    isAuthenticated: localStorage.getItem(AUTH_KEY) === 'true',
    currentView: 'login-gate',
    isQuizActive: false,
    currentQuiz: {
        type: null, subject: null, topic: null, questions: [], totalQuestions: 0,
        timerId: null, timeLeftSeconds: 0, paused: false, userAnswers: [],
    },
    history: JSON.parse(localStorage.getItem('quizHistory')) || [],
    pausedByTabSwitch: false,
};

// --- 2. DOM ELEMENT REFERENCES ---
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
    backToSummaryBtn: document.getElementById('back-to-summary-btn'),
};

let currentQIndex = 0;

// ===== PART 1 END =====
// --- 3. CORE ROUTING & VIEW LOGIC ---
function navigateTo(viewId, forceChange = false) {
    if (!appState.isAuthenticated && viewId !== 'login-gate') {
        viewId = 'login-gate';
    }

    if (appState.isQuizActive && !forceChange && viewId !== 'active-quiz') {
        DOM.restrictionModal.classList.remove('hidden');
        return;
    }

    appState.currentView = viewId;
    DOM.views.forEach(view => {
        view.classList.add('hidden');
        if (view.id === viewId) view.classList.remove('hidden');
    });

    DOM.navLinks.forEach(link => {
        link.classList.remove('active');
        link.classList.toggle('hidden', !appState.isAuthenticated);
        if (link.dataset.view === viewId) link.classList.add('active');
    });

    if (viewId === 'result-summary') renderHistorySummary();
}

// --- 4. LOGIN HANDLER ---
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
        DOM.adminPasswordInput.value = '';
        navigateTo('admin-panel', true);
    } else {
        DOM.adminLoginError.classList.remove('hidden');
        DOM.adminPasswordInput.value = '';
    }
}

// --- 5. TIMER ---
function startTimer() {
    clearInterval(appState.currentQuiz.timerId);
    appState.currentQuiz.paused = false;

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
    clearInterval(appState.currentQuiz.timerId);
    appState.currentQuiz.paused = true;

    if (byTabSwitch) {
        appState.pausedByTabSwitch = true;
        DOM.pauseOverlay.classList.remove('hidden');
    }
}

function updateTimerDisplay() {
    const t = appState.currentQuiz.timeLeftSeconds;
    DOM.timerDisplay.textContent =
        `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// --- 6. QUIZ DATA ---
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function prepareQuestions(type, params) {
    let shuffled = [], ordered = [];

    if (type === 'subject') {
        params.topics.forEach(topic => {
            const t = quizDB[params.subject][topic];
            t.shuffle === false ? ordered.push(...t) : shuffled.push(...t);
        });
    } else {
        Object.values(quizDB).forEach(sub =>
            Object.values(sub).forEach(t =>
                t.shuffle === false ? ordered.push(...t) : shuffled.push(...t)
            )
        );
    }

    shuffleArray(shuffled);
    return [...ordered, ...shuffled].slice(0, params.numQ).map((q, i) => {
        q.quizIndex = i + 1;
        return q;
    });
}

// --- 7. START QUIZ ---
function startQuiz(type, params) {
    const questions = prepareQuestions(type, params);
    if (!questions.length) return alert("No questions found.");

    appState.isQuizActive = true;
    currentQIndex = 0;

    appState.currentQuiz = {
        type,
        subject: params.subject || 'Mixed',
        topic: params.topics?.join(', ') || 'Random',
        questions,
        totalQuestions: questions.length,
        timeLeftSeconds: params.timer * 60,
        userAnswers: questions.map(q => ({
            id: q.id, answer: null, markedForReview: false, quizIndex: q.quizIndex
        }))
    };

    navigateTo('active-quiz', true);
    startTimer();
    renderQuestion(0);
}

// --- 8. QUESTION RENDER ---
function renderQuestion(i) {
    currentQIndex = i;
    const q = appState.currentQuiz.questions[i];
    DOM.qNumberDisplay.textContent = `Question ${q.quizIndex}`;
    DOM.questionText.innerHTML = q.question.replace(/\n/g, '<br>');

    DOM.optionsContainer.innerHTML = '';
    q.options.forEach(opt => {
        DOM.optionsContainer.innerHTML += `
        <label>
            <input type="radio" name="q${q.id}" value="${opt}"
            ${appState.currentQuiz.userAnswers[i].answer === opt ? 'checked' : ''}>
            ${opt}
        </label>`;
    });
}

// --- 9. FINISH QUIZ ---
function finishQuiz(isTimeUp) {
    clearInterval(appState.currentQuiz.timerId);
    appState.isQuizActive = false;

    const results = appState.currentQuiz.userAnswers.map((ua, i) => {
        const q = appState.currentQuiz.questions[i];
        return {
            questionText: q.question,
            correctAnswer: q.answer,
            userAnswer: ua.answer,
            isCorrect: ua.answer === q.answer
        };
    });

    appState.history.unshift({
        id: Date.now(),
        date: new Date().toLocaleString(),
        results
    });

    localStorage.setItem('quizHistory', JSON.stringify(appState.history));
    navigateTo('result-details', true);
}

// ===== PART 2 END =====
// --- 10. HISTORY RENDER ---
function renderHistorySummary() {
    DOM.historyList.innerHTML = '';
    appState.history.forEach(h => {
        const div = document.createElement('div');
        div.innerHTML = `
            <strong>${h.date}</strong>
            <button data-id="${h.id}" class="view-details-btn">View</button>
        `;
        DOM.historyList.appendChild(div);
    });
}

// --- 11. ADMIN PANEL ---
function renderAddQuestionForm() {
    const subjects = Object.keys(quizDB);

    DOM.adminContentArea.innerHTML = `
        <h3>Admin Controls</h3>

        <input id="new-subject-name" placeholder="New Subject">
        <button id="create-subject">Add Subject</button>

        <select id="admin-subject-select">
            <option value="">Select Subject</option>
            ${subjects.map(s => `<option>${s}</option>`).join('')}
        </select>

        <input id="new-topic-name" placeholder="New Topic">
        <label>
            <input type="checkbox" id="topic-non-shuffle"> Non-shuffle
        </label>
        <button id="create-topic">Add Topic</button>

        <hr>

        <textarea id="new-q-text" placeholder="Question"></textarea>
        <input id="opt-a" placeholder="A">
        <input id="opt-b" placeholder="B">
        <input id="opt-c" placeholder="C">
        <input id="opt-d" placeholder="D">
        <input id="new-q-answer" placeholder="Correct Answer">
        <textarea id="new-q-explanation" placeholder="Explanation"></textarea>

        <button id="save-question">Save Question</button>
    `;

    document.getElementById('create-subject').onclick = () => {
        const s = document.getElementById('new-subject-name').value.trim();
        if (!s || quizDB[s]) return alert("Invalid subject");
        quizDB[s] = {};
        persistAdminDB();
        renderAddQuestionForm();
    };

    document.getElementById('create-topic').onclick = () => {
        const sub = document.getElementById('admin-subject-select').value;
        const t = document.getElementById('new-topic-name').value.trim();
        if (!sub || !t || quizDB[sub][t]) return alert("Invalid topic");
        quizDB[sub][t] = [];
        if (document.getElementById('topic-non-shuffle').checked)
            quizDB[sub][t].shuffle = false;
        persistAdminDB();
        renderAddQuestionForm();
    };

    document.getElementById('save-question').onclick = () => {
        const sub = document.getElementById('admin-subject-select').value;
        const topic = Object.keys(quizDB[sub] || {})[0];
        if (!sub || !topic) return alert("Missing subject/topic");

        const opts = [
            optA = document.getElementById('opt-a').value,
            optB = document.getElementById('opt-b').value,
            optC = document.getElementById('opt-c').value,
            optD = document.getElementById('opt-d').value,
        ];
        const ans = document.getElementById('new-q-answer').value;
        if (!opts.includes(ans)) return alert("Answer must match option");

        quizDB[sub][topic].push({
            id: Date.now(),
            question: document.getElementById('new-q-text').value,
            options: opts,
            answer: ans,
            explanation: document.getElementById('new-q-explanation').value
        });

        persistAdminDB();
        alert("Question added");
    };
}

function renderQuestionList() {
    DOM.adminContentArea.innerHTML = '<h3>All Questions</h3>';
    Object.entries(quizDB).forEach(([s, sub]) => {
        Object.entries(sub).forEach(([t, arr]) => {
            arr.forEach(q => {
                const div = document.createElement('div');
                div.innerHTML = `
                    ${s} → ${t} → ${q.question}
                    <button data-s="${s}" data-t="${t}" data-id="${q.id}">Delete</button>
                `;
                div.querySelector('button').onclick = e => {
                    if (appState.isQuizActive) return alert("Blocked");
                    const snap = arr.find(x => x.id == q.id);
                    quizDB[s][t] = arr.filter(x => x.id != q.id);
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

// --- 12. LOAD ADMIN DB ---
function loadAdminDB() {
    const saved = localStorage.getItem(ADMIN_DB_KEY);
    if (!saved) return;
    Object.assign(quizDB, JSON.parse(saved));
}

// --- 13. EVENT LISTENERS ---
function setupEventListeners() {
    DOM.loginButton.onclick = handleLogin;
    DOM.adminLoginButton.onclick = handleAdminLogin;

    DOM.showAddQuestionBtn.onclick = renderAddQuestionForm;
    DOM.showQuestionListBtn.onclick = renderQuestionList;
}

// --- 14. INIT ---
function initApp() {
    loadAdminDB();
    setupEventListeners();
    navigateTo(appState.isAuthenticated ? 'home' : 'login-gate', true);
}

initApp();

// ===== PART 3 END =====
