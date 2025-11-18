/*
 * ============================================
 * FILE: script.js (FINAL - Includes Persistent Login, Fixed History, and Quiz Logic)
 * DESCRIPTION: Core application logic for routing, state, quiz, timer, and history.
 * ============================================
 */

// --- 0. SECURITY & CONFIGURATION ---
const MASTER_PASSWORD = "govuser123"; 
const AUTH_KEY = "quizAppAuthenticated"; // Key for localStorage flag

// --- 1. APPLICATION STATE MANAGEMENT ---
const appState = {
    currentView: 'login-gate', 
    isAuthenticated: localStorage.getItem(AUTH_KEY) === 'true', // CHECK LOCAL STORAGE
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
        link.classList.toggle('hidden', viewId === 'login-gate');
        if (link.dataset.view === viewId) {
            link.classList.add('active');
        }
    });

    if (viewId === 'result-summary') {
        renderHistorySummary();
    }
}

// --- 4. LOGIN HANDLER (UPDATED) ---

function handleLogin() {
    const enteredPassword = DOM.passwordInput.value;
    DOM.loginError.classList.add('hidden');
    
    if (enteredPassword === MASTER_PASSWORD) {
        appState.isAuthenticated = true;
        // PERSISTENCE FIX: Save authentication status to localStorage
        localStorage.setItem(AUTH_KEY, 'true'); 
        navigateTo('home', true);
    } else {
        DOM.loginError.textContent = 'Invalid Password. Please try again.';
        DOM.loginError.classList.remove('hidden');
        DOM.passwordInput.value = '';
    }
}

// --- 5. TIMER LOGIC ---

function startTimer() {
    if (appState.currentQuiz.timerId) clearInterval(appState.currentQuiz.timerId);
    appState.currentQuiz.paused = false;
    DOM.pauseResumeBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    
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
    DOM.pauseResumeBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
    
    if (byTabSwitch) {
        appState.pausedByTabSwitch = true;
        DOM.pauseOverlay.classList.remove('hidden');
    }
}

function updateTimerDisplay() {
    const totalSeconds = appState.currentQuiz.timeLeftSeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    DOM.timerDisplay.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// --- 6. QUIZ SETUP & DATA SELECTION ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function prepareQuestions(type, params) {
    let allQuestions = [];
    let selectedQuestions = [];
    const numQ = parseInt(params.numQ);

    if (type === 'subject') {
        const subjectData = quizDB[params.subject];
        if (!subjectData) return [];

        for (const topic of params.topics) {
            if (subjectData[topic]) {
                allQuestions.push(...subjectData[topic]);
            }
        }
    } else if (type === 'mock' || type === 'daily') {
        const subjectsToUse = (type === 'mock' && params.subject) 
            ? [params.subject] 
            : Object.keys(quizDB);

        for (const subject of subjectsToUse) {
            const subjectData = quizDB[subject];
            for (const topic in subjectData) {
                allQuestions.push(...subjectData[topic]);
            }
        }
    }

    if (allQuestions.length === 0) return [];
    shuffleArray(allQuestions);
    selectedQuestions = allQuestions.slice(0, numQ);
    selectedQuestions.forEach((q, index) => q.quizIndex = index + 1);
    return selectedQuestions;
}

function startQuiz(type, params) {
    const questions = prepareQuestions(type, params);
    
    if (questions.length === 0) {
        alert('Could not find questions based on your selection. Please try again.');
        return;
    }

    appState.isQuizActive = true;
    currentQIndex = 0;
    appState.currentQuiz = {
        type: type,
        subject: params.subject || (type === 'daily' ? 'Mixed' : null),
        topic: type === 'subject' ? params.topics.join(', ') : (type === 'daily' ? 'Random Selection' : 'Full Subject Mock'),
        questions: questions,
        totalQuestions: questions.length,
        timer: params.timer, 
        timerId: null,
        timeLeftSeconds: parseInt(params.timer) * 60,
        paused: false,
        userAnswers: questions.map(q => ({ 
            id: q.id, answer: null, markedForReview: false, quizIndex: q.quizIndex
        })),
    };

    navigateTo('active-quiz', true);
    startTimer();
    renderQuestion(currentQIndex);
    renderNavigator();
}


// --- 7. ACTIVE QUIZ RENDERING & INTERACTION ---

function renderQuestion(index) {
    currentQIndex = index;
    const q = appState.currentQuiz.questions[index];
    const userAnswer = appState.currentQuiz.userAnswers[index].answer;
    const isMarked = appState.currentQuiz.userAnswers[index].markedForReview;

    document.getElementById('quiz-subject-info').textContent = `Subject: ${appState.currentQuiz.subject}`;
    document.getElementById('quiz-topic-info').textContent = `Topic: ${appState.currentQuiz.topic}`;
    
    DOM.qNumberDisplay.textContent = `Question ${q.quizIndex} of ${appState.currentQuiz.totalQuestions}`;
    DOM.questionText.textContent = q.question;

    DOM.questionImageContainer.innerHTML = q.image 
        ? `<img src="${q.image}" alt="Question Image" />`
        : '';

    DOM.optionsContainer.innerHTML = '';
    q.options.forEach((option, idx) => {
        const checked = option === userAnswer ? 'checked' : '';

        DOM.optionsContainer.innerHTML += `
            <label class="option-label">
                <input type="radio" class="option-input" name="question-${q.id}" value="${option}" ${checked} 
                    data-q-index="${index}">
                <span class="option-text">${option}</span>
            </label>
        `;
    });
    
    DOM.prevBtn.disabled = index === 0;
    DOM.nextBtn.disabled = index === appState.currentQuiz.totalQuestions - 1;
    
    DOM.markReviewBtn.classList.toggle('active', isMarked);
    DOM.markReviewBtn.innerHTML = isMarked
        ? '<i class="fas fa-undo-alt"></i> Unmark'
        : '<i class="fas fa-bookmark"></i> Mark for Review';

    DOM.finishQuizBtn.classList.toggle('hidden', index !== appState.currentQuiz.totalQuestions - 1);
    
    renderNavigator();
}

function renderNavigator() {
    DOM.navigatorGrid.innerHTML = '';
    
    appState.currentQuiz.userAnswers.forEach((qAnswer, index) => {
        const isAttempted = qAnswer.answer !== null;
        const isMarked = qAnswer.markedForReview;
        
        let className = 'navigator-btn';
        if (index === currentQIndex) {
            className += ' current';
        }
        if (isAttempted) {
            className += ' attempted';
        }
        if (isMarked) {
            className += ' marked';
        }

        const button = document.createElement('button');
        button.className = className;
        button.textContent = qAnswer.quizIndex;
        button.dataset.index = index;
        DOM.navigatorGrid.appendChild(button);
    });
}

function handleOptionSelect(e) {
    if (e.target.classList.contains('option-input')) {
        const index = parseInt(e.target.dataset.qIndex);
        const answer = e.target.value;
        appState.currentQuiz.userAnswers[index].answer = answer;
        renderNavigator();
    }
}

function toggleMarkForReview() {
    const qAnswer = appState.currentQuiz.userAnswers[currentQIndex];
    qAnswer.markedForReview = !qAnswer.markedForReview;
    renderQuestion(currentQIndex);
}

function clearCurrentAnswer() {
    const q = appState.currentQuiz.questions[currentQIndex];
    
    document.querySelectorAll(`input[name="question-${q.id}"]`).forEach(input => {
        input.checked = false;
    });
    
    appState.currentQuiz.userAnswers[currentQIndex].answer = null;
    renderNavigator();
}

function finishQuiz(isTimeUp = false) {
    if (appState.isQuizActive === false) return;

    if (!confirm(isTimeUp ? "Time is up! Submitting your quiz now." : "Are you sure you want to finish and submit the quiz?")) {
        return;
    }

    if (appState.currentQuiz.timerId) clearInterval(appState.currentQuiz.timerId);

    let correctCount = 0;
    let attemptedCount = 0;
    let totalQuestions = appState.currentQuiz.totalQuestions;
    
    const detailedResults = appState.currentQuiz.userAnswers.map((userA, index) => {
        const originalQ = appState.currentQuiz.questions.find(item => item.id === userA.id);

        const isAttempted = userA.answer !== null;
        const isCorrect = isAttempted && userA.answer === originalQ.answer;
        
        if (isAttempted) attemptedCount++;
        if (isCorrect) correctCount++;

        return {
            qIndex: index,
            questionText: originalQ.question,
            correctAnswer: originalQ.answer,
            userAnswer: userA.answer,
            explanation: originalQ.explanation,
            isCorrect: isCorrect,
            isAttempted: isAttempted,
            markedForReview: userA.markedForReview,
        };
    });

    const accuracy = attemptedCount > 0 ? ((correctCount / attemptedCount) * 100).toFixed(2) : '0.00';
    const score = `${correctCount}/${totalQuestions}`;
    const totalAllocatedTime = parseInt(appState.currentQuiz.timer) * 60;
    const timeTakenSeconds = totalAllocatedTime - appState.currentQuiz.timeLeftSeconds;
    
    const newHistoryEntry = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        type: appState.currentQuiz.type,
        subject: appState.currentQuiz.subject,
        topic: appState.currentQuiz.topic,
        score: score,
        correct: correctCount,
        wrong: attemptedCount - correctCount,
        unattempted: totalQuestions - attemptedCount,
        attempted: attemptedCount,
        total: totalQuestions,
        accuracy: accuracy,
        timeTakenSeconds: timeTakenSeconds,
        timeTakenFormatted: `${String(Math.floor(timeTakenSeconds / 60)).padStart(2, '0')}:${String(timeTakenSeconds % 60).padStart(2, '0')}`,
        results: detailedResults,
    };

    appState.history.unshift(newHistoryEntry);
    localStorage.setItem('quizHistory', JSON.stringify(appState.history));

    appState.isQuizActive = false;
    appState.currentQuiz = {};
    appState.pausedByTabSwitch = false;

    renderResultDetails(newHistoryEntry.id);
    navigateTo('result-details', true);
}


// --- 8. HISTORY & RESULTS RENDERING ---

function renderHistorySummary() {
    appState.history = JSON.parse(localStorage.getItem('quizHistory')) || [];

    DOM.historyList.innerHTML = '';
    
    const noHistoryMessage = document.getElementById('no-history-message');
    
    if (appState.history.length === 0) {
        if (noHistoryMessage) noHistoryMessage.classList.remove('hidden');
        return;
    }
    if (noHistoryMessage) noHistoryMessage.classList.add('hidden');

    appState.history.forEach(item => {
        const historyItemDiv = document.createElement('div');
        historyItemDiv.className = 'history-item';
        historyItemDiv.dataset.id = item.id;

        historyItemDiv.innerHTML = `
            <div class="history-details">
                <strong>${item.subject} (${item.type})</strong> - ${item.topic}
                <p class="text-secondary">${item.date}</p>
            </div>
            <div class="history-score">${item.correct}/${item.total}</div>
            <div class="history-actions">
                <button class="control-btn primary view-details-btn" data-id="${item.id}">
                    <i class="fas fa-search" data-id="${item.id}"></i> View Details
                </button>
                <button class="control-btn danger delete-history-btn" data-id="${item.id}">
                    <i class="fas fa-trash-alt" data-id="${item.id}"></i> Delete
                </button>
            </div>
        `;
        DOM.historyList.appendChild(historyItemDiv);
    });
}

function deleteHistoryEntry(id) {
    if (confirm("Are you sure you want to permanently delete this quiz history?")) {
        appState.history = appState.history.filter(item => item.id !== id);
        localStorage.setItem('quizHistory', JSON.stringify(appState.history));
        renderHistorySummary();
    }
}

function renderResultDetails(id) {
    const historyEntry = appState.history.find(item => item.id === id);
    if (!historyEntry) {
        alert('Result not found. History may have been cleared.');
        navigateTo('result-summary', true);
        return;
    }

    DOM.resultSummaryMetrics.innerHTML = `
        <div class="metric-card correct">
            <span class="value">${historyEntry.correct}</span>
            <span class="label">Correct</span>
        </div>
        <div class="metric-card wrong">
            <span class="value">${historyEntry.wrong}</span>
            <span class="label">Wrong</span>
        </div>
        <div class="metric-card unattempted">
            <span class="value">${historyEntry.unattempted}</span>
            <span class="label">Unattempted</span>
        </div>
        <div class="metric-card accuracy">
            <span class="value">${historyEntry.accuracy}%</span>
            <span class="label">Accuracy (on Attempted)</span>
        </div>
        <div class="metric-card time">
            <span class="value">${historyEntry.timeTakenFormatted}</span>
            <span class="label">Time Taken</span>
        </div>
    `;

    DOM.questionReviewList.innerHTML = '';
    
    historyEntry.results.forEach(result => {
        const statusClass = result.isCorrect ? 'status-correct' : 
                            result.isAttempted ? 'status-wrong' : 'status-unattempted';
        const statusText = result.isCorrect ? 'Correct' :
                           result.isAttempted ? 'Wrong' : 'Unattempted';
        const userAnswerText = result.userAnswer || 'N/A';
        const userClass = result.isCorrect ? 'correct-answer' : 'user-answer';

        const card = document.createElement('div');
        card.className = 'review-question-card';
        card.innerHTML = `
            <div class="review-header">
                <h4>Question ${result.qIndex + 1}</h4>
                <span class="review-status ${statusClass}">${statusText}</span>
            </div>
            <p>${result.questionText}</p>
            
            <div class="review-answers">
                <p>Your Answer: <span class="${userClass}">${userAnswerText}</span></p>
                <p>Correct Answer: <span class="correct-answer">${result.correctAnswer}</span></p>
            </div>
            
            <div class="explanation-box">
                <strong>Explanation:</strong>
                <p>${result.explanation}</p>
            </div>
        `;
        DOM.questionReviewList.appendChild(card);
    });
}

// --- 9. INITIALIZATION & EVENT LISTENERS ---

function initializeSetupScreens() {
    const subjects = Object.keys(quizDB);
    const setupSelects = [DOM.subjectSelect, DOM.mockSubjectSelect];
    
    setupSelects.forEach(select => {
        select.innerHTML = '<option value="">--- Select Subject ---</option>';
        subjects.forEach(subject => {
            select.innerHTML += `<option value="${subject}">${subject}</option>`;
        });
    });

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

    // Quiz Restriction Modal Actions
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

    // Start Quiz Buttons
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

// --- 10. APPLICATION STARTUP (UPDATED) ---

function initApp() {
    initializeSetupScreens();
    setupEventListeners();
    
    // CHECK FOR PERSISTENT AUTHENTICATION
    const initialView = appState.isAuthenticated ? 'home' : 'login-gate';
    navigateTo(initialView, true);
}

initApp();