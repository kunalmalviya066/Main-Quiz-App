/*
 * ============================================
 * FILE: script.js (FINAL - Includes Non-Shuffling Topic Feature)
 * DESCRIPTION: Core application logic with persistent authentication and question formatting.
 * ============================================
 */


let tabSwitchCount = 0;
const MAX_TAB_SWITCHES = 3;
let forceAutoSubmit = false; // you can change this
// --- ADMIN LOCAL STORAGE DB ---
const ADMIN_DB_KEY = "quizAppAdminDB";

// --- 0. SECURITY & CONFIGURATION ---
const MASTER_PASSWORD = "AccessGrant"; 
const ADMIN_PASSWORD = "Admin@123"; // New Admin Password
const AUTH_KEY = "quizAppAuthenticated"; // Key for localStorage flag

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
    
    // Admin Gate
    adminGate: document.getElementById('admin-gate'),
    adminPasswordInput: document.getElementById('admin-password-input'),
    adminLoginButton: document.getElementById('admin-login-button'),
    adminLoginError: document.getElementById('admin-login-error'),
    adminNavLink: document.getElementById('nav-admin'),
    
    // Admin Panel
    adminPanel: document.getElementById('admin-panel'),
    adminControlsGrid: document.getElementById('admin-controls-grid'),
    showAddQuestionBtn: document.getElementById('show-add-question'),
    showQuestionListBtn: document.getElementById('show-question-list'),
    clearHistoryAdminBtn: document.getElementById('clear-history-admin'),
    adminContentArea: document.getElementById('admin-content-area'),
    
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
        link.classList.toggle('hidden', !appState.isAuthenticated);
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
        localStorage.setItem(AUTH_KEY, 'true'); 
        navigateTo('home', true);
    } else {
        DOM.loginError.textContent = 'Invalid Password. Please try again.(or contact owner)';
        DOM.loginError.classList.remove('hidden');
        DOM.passwordInput.value = '';
    }
}
function handleAdminLogin() {
    const enteredPassword = DOM.adminPasswordInput.value;
    DOM.adminLoginError.classList.add('hidden');
    
    if (enteredPassword === ADMIN_PASSWORD) {
        DOM.adminPasswordInput.value = '';
        navigateTo('admin-panel', true);
    } else {
        DOM.adminLoginError.textContent = 'Invalid Admin Password.';
        DOM.adminLoginError.classList.remove('hidden');
        DOM.adminPasswordInput.value = '';
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

// --- 6. QUIZ SETUP & DATA SELECTION (UPDATED) ---

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
    let allShuffledQuestions = [];
    let allNonShuffledQuestions = []; 
    
    const numQ = parseInt(params.numQ);

    if (type === 'subject') {
        const subjectData = quizDB[params.subject];
        if (!subjectData) return [];

        for (const topic of params.topics) {
            let topicQuestions = subjectData[topic];
            if (!topicQuestions) continue;

            // CHECK SHUFFLE PROPERTY AT TOPIC LEVEL
            if (topicQuestions.shuffle === false) {
                // If it shouldn't shuffle, add all questions from that topic directly
                allNonShuffledQuestions.push(...topicQuestions);
            } else {
                // Otherwise, add to the pool to be shuffled later
                allShuffledQuestions.push(...topicQuestions);
            }
        }
    } else if (type === 'mock' || type === 'daily') {
        const subjectsToUse = (type === 'mock' && params.subject) 
            ? [params.subject] 
            : Object.keys(quizDB);

        for (const subject of subjectsToUse) {
            const subjectData = quizDB[subject];
            for (const topic in subjectData) {
                // Determine if any topic should retain order even in a mixed quiz
                 if (subjectData[topic].shuffle === false) {
                    allNonShuffledQuestions.push(...subjectData[topic]);
                } else {
                    allShuffledQuestions.push(...subjectData[topic]);
                }
            }
        }
    }
    
    // Shuffle the mixable questions pool
    shuffleArray(allShuffledQuestions);
    
    // Combine the non-shuffled questions (in their original order) and the shuffled pool
    allQuestions = [...allNonShuffledQuestions, ...allShuffledQuestions];

    if (allQuestions.length === 0) return [];
    
    // Select the required number of questions (take from the combined, ordered list)
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
        topic: params.topics ? params.topics.join(', ') : (type === 'daily' ? 'Random Selection' : 'Full Subject Mock'),
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
    
    // FIX: Handle newline characters (\n) for formatting multiline question text
    const formattedQuestionText = q.question
    .replace(/\\n+/g, '<br>')  // converts \n, \n\n, \n\n\n → <br>
    .replace(/\n+/g, '<br>');  // converts real newlines → <br>

DOM.questionText.innerHTML = formattedQuestionText;
 // Use innerHTML to render <br>

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

    if (!forceAutoSubmit) {
    if (!confirm(
        isTimeUp
            ? "Time is up! Submitting your quiz now."
            : "Are you sure you want to finish and submit the quiz?"
    )) {
        return;
    }
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

       const formattedQuestionText = result.questionText
    .replace(/\\n+/g, '<br>')
    .replace(/\n+/g, '<br>');

    const formattedExplanation = result.explanation
    ? result.explanation.replace(/\\n+/g, '<br>').replace(/\n+/g, '<br>')
    : 'No explanation provided.';

        // const formattedExplanation = result.explanation ? result.explanation.replace(/\n/g, '<br>') : 'No explanation provided.';

        const card = document.createElement('div');
        card.className = 'review-question-card';
        card.innerHTML = `
            <div class="review-header">
                <h4>Question ${result.qIndex + 1}</h4>
                <span class="review-status ${statusClass}">${statusText}</span>
            </div>
            <p>${formattedQuestionText}</p>
            
            <div class="review-answers">
                <p>Your Answer: <span class="${userClass}">${userAnswerText}</span></p>
                <p>Correct Answer: <span class="correct-answer">${result.correctAnswer}</span></p>
            </div>
            
            <div class="explanation-box">
                <strong>Explanation:</strong>
                <p>${formattedExplanation}</p>
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
            const topicData = quizDB[selectedSubject][topic];
            const questionCount = topicData ? topicData.length : 0;
            // Display shuffle status in the selection list
            const shuffleStatus = topicData.shuffle === false ? ' (Non-Shuffling)' : '';
            
            DOM.topicsContainer.innerHTML += `
                <div class="topic-item">
                    <label>
                        <input type="checkbox" name="topic" value="${topic}"> 
                        ${topic} (${questionCount} Qs)${shuffleStatus}
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
    
    // --- ADMIN GATE LISTENERS ---
    DOM.adminLoginButton.addEventListener('click', handleAdminLogin);
    DOM.adminPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAdminLogin();
    });
      
    // ---- DISABLE RIGHT CLICK ----
document.addEventListener('contextmenu', (e) => {
    if (appState.isQuizActive) {
        e.preventDefault();
        alert("Right-click is disabled during the exam.");
    }
});
// ---- DISABLE COPY / PASTE ----
document.addEventListener('copy', (e) => {
    if (appState.isQuizActive) {
        e.preventDefault();
        alert("Copy is disabled during the exam.");
    }
});

document.addEventListener('paste', (e) => {
    if (appState.isQuizActive) {
        e.preventDefault();
        alert("Paste is disabled during the exam.");
    }
});

document.addEventListener('selectstart', (e) => {
    if (appState.isQuizActive) {
        e.preventDefault();
    }
});

// ---- FULLSCREEN EXIT ----
document.addEventListener('fullscreenchange', () => {
    if (appState.isQuizActive && !document.fullscreenElement) {
        alert("Fullscreen exited. Exam will be submitted.");
        finishQuiz(true);
    }
});

// ---- TAB SWITCH DETECTION ----
document.addEventListener("visibilitychange", () => {
    if (!appState.isQuizActive) return;

    if (document.hidden) {
        tabSwitchCount++;

        // 🚨 LIMIT EXCEEDED → AUTO SUBMIT
        if (tabSwitchCount > MAX_TAB_SWITCHES) {
            forceAutoSubmit = true;

            alert(
                "You switched tabs too many times.\n\n" +
                "Your exam will be submitted now."
            );

            // Allow browser to stabilize, then submit
            setTimeout(() => {
                finishQuiz(true);
            }, 200);

            return;
        }

        // ⚠️ WARNING POPUP
        alert(
            `Warning: Tab switch detected!\n\n` +
            `Attempt ${tabSwitchCount} of ${MAX_TAB_SWITCHES}\n` +
            `Do not switch tabs again.`
        );

        pauseTimer(true);
    }
});


    // --- ADMIN PANEL LISTENERS ---
    DOM.showAddQuestionBtn.addEventListener('click', renderAddQuestionForm);
    DOM.showQuestionListBtn.addEventListener('click', renderQuestionList);
    DOM.clearHistoryAdminBtn.addEventListener('click', handleClearHistoryAdmin);
    
    if (appState.isAuthenticated) {
        DOM.adminNavLink.classList.remove('hidden');
    }
}
// --- 10. ADMIN PANEL FUNCTIONS (UPDATED) ---

/**
 * Handles clearing all quiz history from localStorage.
 */
function handleClearHistoryAdmin() {
    if (confirm("WARNING: Are you sure you want to PERMANENTLY delete ALL user quiz history? This cannot be undone.")) {
        localStorage.removeItem('quizHistory');
        localStorage.removeItem(ADMIN_DB_KEY);
        appState.history = [];
        DOM.adminContentArea.innerHTML = '<p class="info-message" style="color:var(--success-color); font-weight:bold;">All user quiz history has been cleared successfully.</p>';
    }
}

/**
 * Renders the form to add a new question, including a new topic creator.
 */
function renderAddQuestionForm() {
    const subjects = Object.keys(quizDB);
    if (subjects.length === 0) {
        DOM.adminContentArea.innerHTML = '<p class="error-message">Cannot add questions. Please define subjects/topics in db.js first.</p>';
        return;
    }
    
    let subjectOptions = subjects.map(s => `<option value="${s}">${s}</option>`).join('');

    DOM.adminContentArea.innerHTML = `
        <h3>Add New Question</h3>
        <form id="add-question-form" class="setup-form-container">
            <div class="setup-step">
                <label for="new-q-subject">1. Select Subject:</label>
                <select id="new-q-subject" required>
                    <option value="">-- Select Subject --</option>
                    ${subjectOptions}
                </select>
            </div>
            
            <div class="setup-step">
                <label for="new-q-topic">2. Select Existing Topic OR Create New:</label>
                <select id="new-q-topic" required>
                    <option value="">-- Select Topic --</option>
                </select>
            </div>
            
            <div class="setup-step" style="border: 1px solid #ffc107; background-color: #fffde7;">
                <label for="new-topic-name" style="color: #ffc107;">3. Create New Topic:</label>
                <input type="text" id="new-topic-name" placeholder="Enter NEW Topic Name">
                <div style="margin-top: 10px;">
                    <label style="display:inline; font-weight:normal;">
                        <input type="checkbox" id="new-topic-non-shuffling"> 
                        **Non-Shuffling Topic** (For DI, Puzzles)
                    </label>
                </div>
                <button type="button" id="create-new-topic-btn" class="control-btn primary" style="width:100%; margin-top:10px;">Create Topic</button>
            </div>

            <label for="new-q-text">4. Question Text (Use \\n for new lines):</label>
            <textarea id="new-q-text" required></textarea>

            <label>5. Options (A, B, C, D):</label>
            <input type="text" id="opt-a" placeholder="Option A" required>
            <input type="text" id="opt-b" placeholder="Option B" required>
            <input type="text" id="opt-c" placeholder="Option C" required>
            <input type="text" id="opt-d" placeholder="Option D" required>

            <label for="new-q-answer">6. Correct Answer (Must match one option):</label>
            <input type="text" id="new-q-answer" required>

            <label for="new-q-explanation">7. Explanation (Use \\n for new lines):</label>
            <textarea id="new-q-explanation" rows="3" required></textarea>
            
            <label for="new-q-image">8. Image URL/Path (Optional):</label>
            <input type="text" id="new-q-image" placeholder="e.g., images/my_chart.png">

            <button type="submit" class="start-button">Save Question</button>
            <p id="question-save-status" class="error-message hidden"></p>
        </form>
    `;

    // Dynamic Topic Loading
    const subjectSelect = document.getElementById('new-q-subject');
    const topicSelect = document.getElementById('new-q-topic');
    const newTopicNameInput = document.getElementById('new-topic-name');
    const createNewTopicBtn = document.getElementById('create-new-topic-btn');
    const nonShufflingCheckbox = document.getElementById('new-topic-non-shuffling');

    const updateTopicDropdown = (selectedSubject) => {
        topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
        if (selectedSubject && quizDB[selectedSubject]) {
            const topics = Object.keys(quizDB[selectedSubject]);
            topics.forEach(t => {
                const topicData = quizDB[selectedSubject][t];
                const shuffleStatus = topicData.shuffle === false ? ' (Sequential)' : '';
                topicSelect.innerHTML += `<option value="${t}">${t}${shuffleStatus}</option>`;
            });
        }
    };

    subjectSelect.addEventListener('change', () => {
        updateTopicDropdown(subjectSelect.value);
    });

    // New Topic Creation Handler
    createNewTopicBtn.addEventListener('click', () => {
        const selectedSubject = subjectSelect.value;
        const newTopicName = newTopicNameInput.value.trim();
        const isNonShuffling = nonShufflingCheckbox.checked;

        if (!selectedSubject) {
            alert("Please select a subject first.");
            return;
        }
        if (!newTopicName) {
            alert("Please enter a name for the new topic.");
            return;
        }
        if (quizDB[selectedSubject][newTopicName]) {
            alert(`Topic "${newTopicName}" already exists! Select it from the dropdown.`);
            return;
        }

        // Create the new topic array/structure
        quizDB[selectedSubject][newTopicName] = [];
        if (isNonShuffling) {
            quizDB[selectedSubject][newTopicName].shuffle = false;
        }
        // 🔐 Persist admin DB
localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(quizDB));

        // Clear creation fields and update dropdown
        newTopicNameInput.value = '';
        nonShufflingCheckbox.checked = false;
        updateTopicDropdown(selectedSubject);
        topicSelect.value = newTopicName; // Auto-select the newly created topic
        alert(`Topic "${newTopicName}" created! Shuffle: ${isNonShuffling ? 'Disabled' : 'Enabled'}.`);
    });

    document.getElementById('add-question-form').addEventListener('submit', handleAddQuestionSubmit);
}

/**
 * Processes the form submission for adding a new question.
 */
function handleAddQuestionSubmit(e) {
    e.preventDefault();
    const statusDiv = document.getElementById('question-save-status');
    statusDiv.classList.add('hidden');
    
    const subject = document.getElementById('new-q-subject').value;
    const topic = document.getElementById('new-q-topic').value;
    const question = document.getElementById('new-q-text').value;
    const answer = document.getElementById('new-q-answer').value;
    const explanation = document.getElementById('new-q-explanation').value;
    const image = document.getElementById('new-q-image').value || null;
    
    const options = [
        document.getElementById('opt-a').value,
        document.getElementById('opt-b').value,
        document.getElementById('opt-c').value,
        document.getElementById('opt-d').value
    ];

    if (!options.includes(answer)) {
        statusDiv.textContent = "Error: Correct Answer must match one of the options (A, B, C, or D).";
        statusDiv.classList.remove('hidden');
        return;
    }

    let maxId = 0;
    Object.values(quizDB).forEach(subData => {
        Object.values(subData).forEach(topicArray => {
            topicArray.forEach(q => {
                if (q.id > maxId) maxId = q.id;
            });
        });
    });

    const newQuestion = {
        id: maxId + 1,
        question: question,
        image: image,
        options: options,
        answer: answer,
        explanation: explanation,
    };

    if (quizDB[subject] && quizDB[subject][topic]) {
        quizDB[subject][topic].push(newQuestion);

// 🔐 Persist admin DB
localStorage.setItem(ADMIN_DB_KEY, JSON.stringify(quizDB));

        
        document.getElementById('add-question-form').reset();
        statusDiv.textContent = `Success! Question ID ${newQuestion.id} added to ${subject} - ${topic}. (NOTE: Refresh required for changes to take full effect)`;
        statusDiv.style.color = 'var(--success-color)';
        statusDiv.classList.remove('hidden');
    } else {
        statusDiv.textContent = "Error: Subject or Topic structure not found in db.js.";
        statusDiv.style.color = 'var(--danger-color)';
        statusDiv.classList.remove('hidden');
    }
}

/**
 * Renders the full list of all questions (Read function).
 */
function renderQuestionList() {
    DOM.adminContentArea.innerHTML = '<h3>All Questions in Database</h3><div id="question-list-container"></div>';
    const listContainer = document.getElementById('question-list-container');
    listContainer.innerHTML = '<p class="info-message">Displaying the list of questions for review and editing (edit/delete buttons not yet functional in this simple version).</p>';
    
    let questionCount = 0;
    let tableHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>Topic (Shuffle)</th>
                    <th>Question (Snippet)</th>
                    <th>Answer</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.entries(quizDB).forEach(([subject, subData]) => {
        Object.entries(subData).forEach(([topic, topicArray]) => {
            questionCount += topicArray.length;
            
            const isNonShuffling = topicArray.shuffle === false;
            const shuffleDisplay = isNonShuffling ? 'Sequential' : 'Shuffling';

            topicArray.forEach(q => {
                const snippet = q.question.replace(/\n/g, ' ').substring(0, 50) + '...';

                tableHTML += `
                    <tr>
                        <td>${q.id}</td>
                        <td>${subject}</td>
                        <td>${topic} (${shuffleDisplay})</td>
                        <td>${snippet}</td>
                        <td>${q.answer}</td>
                    </tr>
                `;
            });
        });
    });

    tableHTML += `</tbody></table><p>Total Questions Loaded: <strong>${questionCount}</strong></p>`;
    listContainer.innerHTML = tableHTML;
}

function loadAdminDB() {
    const savedDB = localStorage.getItem(ADMIN_DB_KEY);
    if (!savedDB) return;

    try {
        const parsedDB = JSON.parse(savedDB);

        // Merge saved DB into quizDB
        Object.keys(parsedDB).forEach(subject => {
            if (!quizDB[subject]) {
                quizDB[subject] = parsedDB[subject];
            } else {
                Object.keys(parsedDB[subject]).forEach(topic => {
                    if (!quizDB[subject][topic]) {
                        quizDB[subject][topic] = parsedDB[subject][topic];
                    } else {
                        // Replace topic completely (safe & predictable)
                        quizDB[subject][topic] = parsedDB[subject][topic];
                    }
                });
            }
        });

        console.log("✅ Admin DB loaded from localStorage");
    } catch (err) {
        console.error("❌ Failed to load admin DB:", err);
    }
}

// --- 11. APPLICATION STARTUP ---

function initApp() {
    loadAdminDB();          // 🔥 ADD THIS LINE FIRST
    initializeSetupScreens();
    setupEventListeners();
    
    const initialView = appState.isAuthenticated ? 'home' : 'login-gate';
    navigateTo(initialView, true);
}

initApp();