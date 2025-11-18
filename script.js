/*
 * ============================================
 * FILE: script.js (FIXED with Client-Side Password Gate)
 * DESCRIPTION: Core application logic for routing, state, quiz, timer, and history.
 * ============================================
 */

// --- 0. SECURITY & CONFIGURATION ---
const MASTER_PASSWORD = "govuser123"; // WARNING: Easily readable in source code!

// --- 1. APPLICATION STATE MANAGEMENT ---
const appState = {
    currentView: 'login-gate', // Start here
    isAuthenticated: false,
    isQuizActive: false,
    currentQuiz: {
        type: null, subject: null, topic: null, questions: [], totalQuestions: 0,
        timerId: null, timeLeftSeconds: 0, paused: false, userAnswers: [],
    },
    history: JSON.parse(localStorage.getItem('quizHistory')) || [],
    pausedByTabSwitch: false,
};

// --- 2. DOM ELEMENT REFERENCES (UPDATED) ---
const DOM = {
    // Views
    appContainer: document.getElementById('app-container'),
    navLinks: document.querySelectorAll('.nav-link'),
    views: document.querySelectorAll('.view'),
    homeOptions: document.querySelectorAll('.home-option-card'),

    // Login Gate
    loginGate: document.getElementById('login-gate'),
    passwordInput: document.getElementById('password-input'),
    loginButton: document.getElementById('login-button'),
    loginError: document.getElementById('login-error'),

    // Setup Screens
    subjectSelect: document.getElementById('subject-select'),
    mockSubjectSelect: document.getElementById('mock-subject-select'),
    topicsContainer: document.getElementById('topics-checkbox-container'),
    numQuestions: document.getElementById('num-questions'),
    timerMinutes: document.getElementById('timer-minutes'),
    startSubjectQuiz: document.getElementById('start-subject-quiz'),
    startDailyQuiz: document.getElementById('start-daily-quiz'),
    startMockQuiz: document.getElementById('start-mock-quiz'),

    // Active Quiz
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

    // Modals/Overlays
    restrictionModal: document.getElementById('quiz-restriction-modal'),
    cancelQuizBtn: document.getElementById('cancel-quiz-btn'),
    stayQuizBtn: document.getElementById('stay-quiz-btn'),
    pauseOverlay: document.getElementById('pause-screen-overlay'),
    resumeOverlayBtn: document.getElementById('resume-from-overlay-btn'),
    
    // Results
    historyList: document.getElementById('history-list'),
    resultDetailsView: document.getElementById('result-details'),
    resultSummaryMetrics: document.getElementById('result-summary-metrics'),
    questionReviewList: document.getElementById('question-review-list'),
    backToSummaryBtn: document.getElementById('back-to-summary-btn'),
};

let currentQIndex = 0;

// --- 3. CORE ROUTING & VIEW LOGIC ---

/**
 * Changes the active view in the SPA.
 */
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
        if (view.id === viewId) {
            view.classList.remove('hidden');
        }
    });

    DOM.navLinks.forEach(link => {
        link.classList.remove('active');
        // Only show nav links if authenticated and not on login screen
        link.classList.toggle('hidden', viewId === 'login-gate');
        if (link.dataset.view === viewId) {
            link.classList.add('active');
        }
    });

    if (viewId === 'result-summary') {
        renderHistorySummary();
    }
}

// --- 4. LOGIN HANDLER ---

function handleLogin() {
    const enteredPassword = DOM.passwordInput.value;
    DOM.loginError.classList.add('hidden');
    
    if (enteredPassword === MASTER_PASSWORD) {
        appState.isAuthenticated = true;
        navigateTo('home', true);
    } else {
        DOM.loginError.textContent = 'Invalid Password. Please try again.';
        DOM.loginError.classList.remove('hidden');
        DOM.passwordInput.value = ''; // Clear input
    }
}


// --- 5. TIMER LOGIC (Unchanged) ---
function startTimer() { /* ... unchanged ... */ }
function pauseTimer(byTabSwitch = false) { /* ... unchanged ... */ }
function updateTimerDisplay() { /* ... unchanged ... */ }

// --- 6. QUIZ SETUP & DATA SELECTION (Unchanged) ---
function shuffleArray(array) { /* ... unchanged ... */ return array; }
function prepareQuestions(type, params) { /* ... unchanged ... */ }
function startQuiz(type, params) { /* ... unchanged ... */ }

// --- 7. ACTIVE QUIZ RENDERING & INTERACTION (Unchanged) ---
function renderQuestion(index) { /* ... unchanged ... */ }
function renderNavigator() { /* ... unchanged ... */ }
function handleOptionSelect(e) { /* ... unchanged ... */ }
function toggleMarkForReview() { /* ... unchanged ... */ }
function clearCurrentAnswer() { /* ... unchanged ... */ }
function finishQuiz(isTimeUp = false) { /* ... unchanged ... */ }

// --- 8. HISTORY & RESULTS RENDERING (Unchanged) ---
function renderHistorySummary() { /* ... unchanged ... */ }
function deleteHistoryEntry(id) { /* ... unchanged ... */ }
function renderResultDetails(id) { /* ... unchanged ... */ }

// --- 9. INITIALIZATION & EVENT LISTENERS ---

/**
 * Fills the subject dropdowns and initializes topic/start button states.
 */
function initializeSetupScreens() {
    const subjects = Object.keys(quizDB);
    const setupSelects = [DOM.subjectSelect, DOM.mockSubjectSelect];
    
    setupSelects.forEach(select => {
        select.innerHTML = '<option value="">--- Select Subject ---</option>';
        subjects.forEach(subject => {
            select.innerHTML += `<option value="${subject}">${subject}</option>`;
        });
    });

    // Handle Subject Practice (dynamic topic loading)
    DOM.subjectSelect.addEventListener('change', (e) => {
        DOM.topicsContainer.innerHTML = '';
        const selectedSubject = e.target.value;
        if (!selectedSubject) {
            DOM.topicsContainer.innerHTML = '<p class="placeholder">Select a subject first.</p>';
            return;
        }

        const topics = Object.keys(quizDB[selectedSubject]);
        topics.forEach(topic => {
            const questionCount = quizDB[selectedSubject] && quizDB[selectedSubject][topic] ? quizDB[selectedSubject][topic].length : 0;
            
            DOM.topicsContainer.innerHTML += `
                <div class="topic-item">
                    <label>
                        <input type="checkbox" name="topic" value="${topic}"> 
                        ${topic} (${questionCount} Qs)
                    </label>
                </div>
            `;
        });
    });
}

/**
 * Setup function for all event listeners.
 */
function setupEventListeners() {
    // LOGIN GATE LISTENERS
    DOM.loginButton.addEventListener('click', handleLogin);
    DOM.passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // General Navigation
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(e.currentTarget.dataset.view);
        });
    });
    DOM.homeOptions.forEach(card => {
        card.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.viewTarget;
            if (target) navigateTo(target);
        });
    });

    // Quiz Restriction Modal Actions (Unchanged)
    DOM.stayQuizBtn.addEventListener('click', () => { DOM.restrictionModal.classList.add('hidden'); });
    DOM.cancelQuizBtn.addEventListener('click', () => {
        if (appState.currentQuiz.timerId) clearInterval(appState.currentQuiz.timerId);
        appState.isQuizActive = false;
        appState.currentQuiz = {};
        appState.pausedByTabSwitch = false;
        
        const targetViewId = DOM.navLinks.find(link => !link.classList.contains('active'))?.dataset.view || 'home';
        DOM.restrictionModal.classList.add('hidden');
        navigateTo(targetViewId, true);
    });

    // Start Quiz Buttons (Unchanged)
    DOM.startSubjectQuiz.addEventListener('click', () => {
        const selectedTopics = Array.from(DOM.topicsContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        if (!DOM.subjectSelect.value || selectedTopics.length === 0) { alert('Please select a Subject and at least one Topic.'); return; }
        startQuiz('subject', { subject: DOM.subjectSelect.value, topics: selectedTopics, numQ: DOM.numQuestions.value, timer: DOM.timerMinutes.value });
    });
    DOM.startDailyQuiz.addEventListener('click', () => {
         startQuiz('daily', { subject: 'Mixed', topics: null, numQ: document.getElementById('daily-num-questions').value, timer: document.getElementById('daily-timer-minutes').value });
    });
    DOM.startMockQuiz.addEventListener('click', () => {
        if (!DOM.mockSubjectSelect.value) { alert('Please select a Subject for the Full Mock.'); return; }
        startQuiz('mock', { subject: DOM.mockSubjectSelect.value, topics: null, numQ: document.getElementById('mock-num-questions').value, timer: document.getElementById('mock-timer-minutes').value });
    });

    // Active Quiz Controls
    DOM.optionsContainer.addEventListener('change', handleOptionSelect);
    DOM.prevBtn.addEventListener('click', () => renderQuestion(currentQIndex - 1));
    DOM.nextBtn.addEventListener('click', () => renderQuestion(currentQIndex + 1));
    DOM.navigatorGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('navigator-btn')) {
            renderQuestion(parseInt(e.target.dataset.index));
        }
    });
    DOM.markReviewBtn.addEventListener('click', toggleMarkForReview);
    DOM.clearAnswerBtn.addEventListener('click', clearCurrentAnswer);
    DOM.finishQuizBtn.addEventListener('click', () => finishQuiz(false));
    DOM.navigatorFinishBtn.addEventListener('click', () => finishQuiz(false));
    
    // Pause/Resume Logic
    DOM.pauseResumeBtn.addEventListener('click', () => {
        if (appState.currentQuiz.paused) { startTimer(); } else { pauseTimer(false); }
    });
    document.addEventListener('visibilitychange', () => {
        if (appState.isQuizActive && !appState.currentQuiz.paused && document.hidden) { pauseTimer(true); }
    });
    DOM.resumeOverlayBtn.addEventListener('click', () => {
        appState.pausedByTabSwitch = false;
        DOM.pauseOverlay.classList.add('hidden');
        startTimer();
    });

    // History and Results Actions
    DOM.historyList.addEventListener('click', (e) => {
        const viewButton = e.target.closest('.view-details-btn');
        const deleteButton = e.target.closest('.delete-history-btn');
        
        if (viewButton) {
            const id = parseInt(viewButton.dataset.id);
            renderResultDetails(id);
            navigateTo('result-details', true);
        } else if (deleteButton) {
            const id = parseInt(deleteButton.dataset.id);
            deleteHistoryEntry(id);
        }
    });
    
    DOM.backToSummaryBtn.addEventListener('click', () => {
        navigateTo('result-summary', true);
    });
}

// --- 10. APPLICATION STARTUP ---

function initApp() {
    initializeSetupScreens();
    setupEventListeners();
    navigateTo('login-gate', true); // Start on the login gate
}

initApp();