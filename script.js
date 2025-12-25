/* ============================================
   FILE: script.js (FULL VERSION WITH ADMIN CRUD + UNDO)
   ============================================ */

let tabSwitchCount = 0;
const MAX_TAB_SWITCHES = 3;
let forceAutoSubmit = false;

const ADMIN_DB_KEY = "quizAppAdminDB";
const AUTH_KEY = "quizAppAuthenticated";
const MASTER_PASSWORD = "AccessGrant";
const ADMIN_PASSWORD = "Admin@123";

/* ---------- ADMIN UNDO SYSTEM ---------- */
let adminUndoStack = null;
let adminUndoTimer = null;
const ADMIN_UNDO_TIMEOUT = 30000;

/* ---------- APP STATE ---------- */
const appState = {
    isAuthenticated: localStorage.getItem(AUTH_KEY) === 'true',
    isQuizActive: false,
    pausedByTabSwitch: false,
    currentQuiz: {},
    history: JSON.parse(localStorage.getItem('quizHistory')) || []
};

/* ---------- DOM ---------- */
const DOM = {
    views: document.querySelectorAll('.view'),
    navLinks: document.querySelectorAll('.nav-link'),

    loginGate: document.getElementById('login-gate'),
    passwordInput: document.getElementById('password-input'),
    loginButton: document.getElementById('login-button'),
    loginError: document.getElementById('login-error'),

    adminPasswordInput: document.getElementById('admin-password-input'),
    adminLoginButton: document.getElementById('admin-login-button'),
    adminLoginError: document.getElementById('admin-login-error'),
    adminNavLink: document.getElementById('nav-admin'),

    adminContentArea: document.getElementById('admin-content-area'),

    subjectSelect: document.getElementById('subject-select'),
    mockSubjectSelect: document.getElementById('mock-subject-select'),
    topicsContainer: document.getElementById('topics-checkbox-container'),

    startSubjectQuiz: document.getElementById('start-subject-quiz'),
    startDailyQuiz: document.getElementById('start-daily-quiz'),
    startMockQuiz: document.getElementById('start-mock-quiz'),

    timerDisplay: document.getElementById('timer-display'),
    pauseResumeBtn: document.getElementById('pause-resume-btn'),
    questionText: document.getElementById('question-text'),
    optionsContainer: document.getElementById('options-container'),
    navigatorGrid: document.getElementById('question-navigator-grid'),

    restrictionModal: document.getElementById('quiz-restriction-modal'),
    pauseOverlay: document.getElementById('pause-screen-overlay'),
    resumeOverlayBtn: document.getElementById('resume-from-overlay-btn'),

    historyList: document.getElementById('history-list'),
    resultSummaryMetrics: document.getElementById('result-summary-metrics'),
    questionReviewList: document.getElementById('question-review-list'),
    backToSummaryBtn: document.getElementById('back-to-summary-btn')
};

/* ---------- UTIL ---------- */
function persistAdminDB() {
    localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(quizDB));
}

function softDelete(label, snapshot, restoreFn) {
    if (adminUndoTimer) clearTimeout(adminUndoTimer);

    adminUndoStack = { snapshot, restoreFn };

    DOM.adminContentArea.insertAdjacentHTML('afterbegin', `
        <div id="undo-banner" style="padding:10px;background:#fff3cd;">
            ${label} deleted.
            <button id="undo-btn">UNDO</button>
        </div>
    `);

    document.getElementById('undo-btn').onclick = () => {
        restoreFn(snapshot);
        adminUndoStack = null;
        document.getElementById('undo-banner').remove();
        persistAdminDB();
        renderQuestionList();
    };

    adminUndoTimer = setTimeout(() => {
        adminUndoStack = null;
        document.getElementById('undo-banner')?.remove();
    }, ADMIN_UNDO_TIMEOUT);
}

/* ---------- LOGIN ---------- */
DOM.loginButton.onclick = () => {
    if (DOM.passwordInput.value === MASTER_PASSWORD) {
        localStorage.setItem(AUTH_KEY, 'true');
        location.reload();
    } else {
        DOM.loginError.textContent = "Invalid password";
        DOM.loginError.classList.remove('hidden');
    }
};

DOM.adminLoginButton.onclick = () => {
    if (DOM.adminPasswordInput.value === ADMIN_PASSWORD) {
        document.getElementById('nav-admin').classList.remove('hidden');
        navigateTo('admin-panel');
    } else {
        DOM.adminLoginError.textContent = "Invalid admin password";
        DOM.adminLoginError.classList.remove('hidden');
    }
};
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function startTimer() {
    clearInterval(appState.currentQuiz.timerId);
    appState.currentQuiz.timerId = setInterval(() => {
        if (appState.currentQuiz.paused) return;
        appState.currentQuiz.timeLeftSeconds--;
        DOM.timerDisplay.textContent =
            Math.floor(appState.currentQuiz.timeLeftSeconds / 60)
            .toString().padStart(2, '0') + ":" +
            (appState.currentQuiz.timeLeftSeconds % 60).toString().padStart(2, '0');

        if (appState.currentQuiz.timeLeftSeconds <= 0) {
            finishQuiz(true);
        }
    }, 1000);
}

function pauseTimer(byTab) {
    appState.currentQuiz.paused = true;
    clearInterval(appState.currentQuiz.timerId);
    if (byTab) DOM.pauseOverlay.classList.remove('hidden');
}

document.addEventListener('visibilitychange', () => {
    if (!appState.isQuizActive) return;

    if (document.hidden) {
        tabSwitchCount++;
        if (tabSwitchCount > MAX_TAB_SWITCHES) {
            forceAutoSubmit = true;
            finishQuiz(true);
        } else {
            alert(`Tab switch ${tabSwitchCount}/${MAX_TAB_SWITCHES}`);
            pauseTimer(true);
        }
    }
});

document.addEventListener('fullscreenchange', () => {
    if (appState.isQuizActive && !document.fullscreenElement) {
        alert("Fullscreen exited. Submitting.");
        finishQuiz(true);
    }
});

document.addEventListener('contextmenu', e => {
    if (appState.isQuizActive) e.preventDefault();
});
document.addEventListener('copy', e => appState.isQuizActive && e.preventDefault());
document.addEventListener('paste', e => appState.isQuizActive && e.preventDefault());

function finishQuiz(force) {
    if (!appState.isQuizActive) return;
    if (!force && !confirm("Submit quiz?")) return;

    clearInterval(appState.currentQuiz.timerId);
    appState.isQuizActive = false;

    localStorage.setItem('quizHistory', JSON.stringify(appState.history));
    navigateTo('result-summary');
}
function renderAddQuestionForm() {
    DOM.adminContentArea.innerHTML = `
        <h3>Admin Control Panel</h3>

        <input id="new-subject-name" placeholder="New Subject">
        <button id="add-subject">Add Subject</button>

        <select id="subject-dd"></select>
        <input id="new-topic-name" placeholder="New Topic">
        <label><input type="checkbox" id="topic-noshu"> Non-Shuffle</label>
        <button id="add-topic">Add Topic</button>

        <button id="delete-topic">Delete Topic</button>
        <button id="delete-subject">Delete Subject</button>
    `;

    const subjectDD = document.getElementById('subject-dd');
    subjectDD.innerHTML = `<option value="">Select</option>`;
    Object.keys(quizDB).forEach(s => subjectDD.innerHTML += `<option>${s}</option>`);

    document.getElementById('add-subject').onclick = () => {
        const name = document.getElementById('new-subject-name').value.trim();
        if (!name || quizDB[name]) return alert("Invalid subject");
        quizDB[name] = {};
        persistAdminDB();
        renderAddQuestionForm();
    };

    document.getElementById('add-topic').onclick = () => {
        const s = subjectDD.value;
        const t = document.getElementById('new-topic-name').value.trim();
        if (!s || !t || quizDB[s][t]) return alert("Invalid topic");
        quizDB[s][t] = [];
        if (document.getElementById('topic-noshu').checked)
            quizDB[s][t].shuffle = false;
        persistAdminDB();
        renderAddQuestionForm();
    };

    document.getElementById('delete-topic').onclick = () => {
        const s = subjectDD.value;
        const t = Object.keys(quizDB[s] || {})[0];
        if (!s || !t) return;
        const snap = quizDB[s][t];
        delete quizDB[s][t];
        persistAdminDB();
        softDelete(`Topic ${t}`, { s, t, snap }, d => quizDB[d.s][d.t] = d.snap);
        renderAddQuestionForm();
    };

    document.getElementById('delete-subject').onclick = () => {
        const s = subjectDD.value;
        if (!s) return;
        const snap = quizDB[s];
        delete quizDB[s];
        persistAdminDB();
        softDelete(`Subject ${s}`, { s, snap }, d => quizDB[d.s] = d.snap);
        renderAddQuestionForm();
    };
}

/* ---------- LOAD ADMIN DB ---------- */
function loadAdminDB() {
    const saved = localStorage.getItem(ADMIN_DB_KEY);
    if (!saved) return;
    Object.assign(quizDB, JSON.parse(saved));
}

/* ---------- INIT ---------- */
function navigateTo(id) {
    DOM.views.forEach(v => v.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function initApp() {
    loadAdminDB();
    renderAddQuestionForm();
    navigateTo(appState.isAuthenticated ? 'home' : 'login-gate');
}

initApp();
