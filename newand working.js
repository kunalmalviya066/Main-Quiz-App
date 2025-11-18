/*
 * ============================================
 * FILE: script.js (FIXED - History Event Delegation)
 * DESCRIPTION: Core application logic for routing, state, quiz, timer, and history.
 * ============================================
 */

// --- 1. APPLICATION STATE MANAGEMENT ---
const appState = {
    currentView: 'home',
    isQuizActive: false,
    currentQuiz: {
        type: null,        // 'subject', 'daily', or 'mock'
        subject: null,
        topic: null,       // Topics for 'subject' quiz, null for others
        questions: [],     // Array of question objects
        totalQuestions: 0,
        timerId: null,
        timeLeftSeconds: 0,
        paused: false,
        userAnswers: [],   // Array of { questionId, answer, markedForReview }
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
    finishQuizBtn: document.getElementById('finish-quiz-btn'), // Bottom finish
    navigatorGrid: document.getElementById('question-navigator-grid'),
    navigatorFinishBtn: document.getElementById('navigator-finish-btn'), // Panel finish

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

// Global for the currently viewed question index in active quiz
let currentQIndex = 0;

// --- 3. CORE ROUTING & VIEW LOGIC ---

/**
 * Changes the active view in the SPA.
 * @param {string} viewId - The ID of the view section to show.
 * @param {boolean} forceChange - If true, bypasses the active quiz check.
 */
function navigateTo(viewId, forceChange = false) {
    if (appState.isQuizActive && !forceChange && viewId !== 'active-quiz') {
        DOM.restrictionModal.classList.remove('hidden');
        return;
    }

    // Update state and active class for navigation
    appState.currentView = viewId;
    DOM.views.forEach(view => {
        view.classList.add('hidden');
        if (view.id === viewId) {
            view.classList.remove('hidden');
        }
    });

    DOM.navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.view === viewId) {
            link.classList.add('active');
        }
    });

    // Specific actions for views
    if (viewId === 'result-summary') {
        renderHistorySummary();
    }
}

// --- 4. TIMER LOGIC ---

/**
 * Starts or resumes the quiz timer.
 */
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
            finishQuiz(true); // Auto-submit on time up
        }
    }, 1000);
}

/**
 * Pauses the quiz timer.
 * @param {boolean} byTabSwitch - True if paused due to tab/window focus loss.
 */
function pauseTimer(byTabSwitch = false) {
    if (appState.currentQuiz.timerId) clearInterval(appState.currentQuiz.timerId);
    appState.currentQuiz.paused = true;
    DOM.pauseResumeBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
    
    if (byTabSwitch) {
        appState.pausedByTabSwitch = true;
        DOM.pauseOverlay.classList.remove('hidden'); // Show the "black screen"
    }
}

/**
 * Formats seconds into MM:SS string.
 */
function updateTimerDisplay() {
    const totalSeconds = appState.currentQuiz.timeLeftSeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    DOM.timerDisplay.textContent = 
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// --- 5. QUIZ SETUP & DATA SELECTION ---

/**
 * Helper to shuffle an array (Fisher-Yates).
 * @param {Array} array - The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/**
 * Collects and prepares questions for the quiz based on setup parameters.
 * @param {string} type - 'subject', 'daily', or 'mock'.
 * @param {object} params - Setup parameters (subject, topics, numQ, timer).
 * @returns {Array} - Array of selected and shuffled questions.
 */
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

    // Shuffle all questions and select the required number
    shuffleArray(allQuestions);
    selectedQuestions = allQuestions.slice(0, numQ);
    
    // Add unique index (1-based) to each question
    selectedQuestions.forEach((q, index) => q.quizIndex = index + 1);

    return selectedQuestions;
}

/**
 * Initializes and starts the quiz session.
 * @param {string} type - 'subject', 'daily', or 'mock'.
 * @param {object} params - Setup parameters.
 */
function startQuiz(type, params) {
    const questions = prepareQuestions(type, params);
    
    if (questions.length === 0) {
        alert('Could not find questions based on your selection. Please try again.');
        return;
    }

    // Reset State
    appState.isQuizActive = true;
    currentQIndex = 0;
    appState.currentQuiz = {
        type: type,
        subject: params.subject || (type === 'daily' ? 'Mixed' : null),
        topic: type === 'subject' ? params.topics.join(', ') : (type === 'daily' ? 'Random Selection' : 'Full Subject Mock'),
        questions: questions,
        totalQuestions: questions.length,
        timerId: null,
        // Ensure that the timer value is retrieved correctly from params
        timer: params.timer, 
        timeLeftSeconds: parseInt(params.timer) * 60,
        paused: false,
        userAnswers: questions.map(q => ({ 
            id: q.id, 
            answer: null, 
            markedForReview: false,
            quizIndex: q.quizIndex
        })),
    };

    navigateTo('active-quiz', true);
    startTimer();
    renderQuestion(currentQIndex);
    renderNavigator();
}


// --- 6. ACTIVE QUIZ RENDERING & INTERACTION ---

/**
 * Renders the current question based on currentQIndex.
 * @param {number} index - The index (0-based) of the question to render.
 */
function renderQuestion(index) {
    currentQIndex = index;
    const q = appState.currentQuiz.questions[index];
    // Find the full question object (including original subject/topic) if not present
    const fullQuestion = quizDB[appState.currentQuiz.subject] 
        ? Object.values(quizDB[appState.currentQuiz.subject]).flat().find(item => item.id === q.id)
        : q; // Use q if full context isn't easily found (like in daily quiz)

    const userAnswer = appState.currentQuiz.userAnswers[index].answer;
    const isMarked = appState.currentQuiz.userAnswers[index].markedForReview;

    // 1. Update Header Info
    // Use stored quiz subject/topic for display
    document.getElementById('quiz-subject-info').textContent = `Subject: ${appState.currentQuiz.subject}`;
    document.getElementById('quiz-topic-info').textContent = `Topic: ${appState.currentQuiz.topic}`;
    
    // 2. Update Question Text
    DOM.qNumberDisplay.textContent = `Question ${q.quizIndex} of ${appState.currentQuiz.totalQuestions}`;
    DOM.questionText.textContent = q.question;

    // 3. Handle Image
    DOM.questionImageContainer.innerHTML = q.image 
        ? `<img src="${q.image}" alt="Question Image" />`
        : '';

    // 4. Render Options
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
    
    // 5. Update Controls
    DOM.prevBtn.disabled = index === 0;
    DOM.nextBtn.disabled = index === appState.currentQuiz.totalQuestions - 1;
    
    DOM.markReviewBtn.classList.toggle('active', isMarked);
    DOM.markReviewBtn.innerHTML = isMarked
        ? '<i class="fas fa-undo-alt"></i> Unmark'
        : '<i class="fas fa-bookmark"></i> Mark for Review';

    DOM.finishQuizBtn.classList.toggle('hidden', index !== appState.currentQuiz.totalQuestions - 1);
    
    // Highlight the current navigator button
    renderNavigator();
}

/**
 * Renders or updates the question navigation grid.
 */
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

/**
 * Handles user selecting an option.
 * @param {Event} e 
 */
function handleOptionSelect(e) {
    if (e.target.classList.contains('option-input')) {
        const index = parseInt(e.target.dataset.qIndex);
        const answer = e.target.value;
        appState.currentQuiz.userAnswers[index].answer = answer;
        renderNavigator(); // Update navigator status
    }
}

/**
 * Handles user clicking the Mark for Review button.
 */
function toggleMarkForReview() {
    const qAnswer = appState.currentQuiz.userAnswers[currentQIndex];
    qAnswer.markedForReview = !qAnswer.markedForReview;
    renderQuestion(currentQIndex); // Re-render to update the button and navigator
}

/**
 * Handles clearing the selected answer for the current question.
 */
function clearCurrentAnswer() {
    const q = appState.currentQuiz.questions[currentQIndex];
    
    // Clear the selected radio button
    document.querySelectorAll(`input[name="question-${q.id}"]`).forEach(input => {
        input.checked = false;
    });
    
    // Update state
    appState.currentQuiz.userAnswers[currentQIndex].answer = null;
    renderNavigator();
}

/**
 * Checks all answers, calculates score, saves history, and transitions to results.
 * @param {boolean} isTimeUp - True if triggered by timer running out.
 */
function finishQuiz(isTimeUp = false) {
    if (appState.isQuizActive === false) return; // Prevent double submission

    if (!confirm(isTimeUp ? "Time is up! Submitting your quiz now." : "Are you sure you want to finish and submit the quiz?")) {
        return;
    }

    // Stop timer
    if (appState.currentQuiz.timerId) clearInterval(appState.currentQuiz.timerId);

    // 1. Calculate Score and Metrics
    let correctCount = 0;
    let attemptedCount = 0;
    let totalQuestions = appState.currentQuiz.totalQuestions;
    
    const detailedResults = appState.currentQuiz.userAnswers.map((userA, index) => {
        const q = appState.currentQuiz.questions[index];
        
        // Find the correct answer and explanation in the original question data.
        // This is necessary because questions in daily/mock quizzes might lose their original context
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
    // Correctly calculate time taken by subtracting time left from total allocated time
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

    // 2. Save History
    // Update appState.history and localStorage
    appState.history.unshift(newHistoryEntry);
    localStorage.setItem('quizHistory', JSON.stringify(appState.history));

    // 3. Reset State and Navigate
    appState.isQuizActive = false;
    appState.currentQuiz = {};
    appState.pausedByTabSwitch = false;

    // 4. Show Results
    // The history is now updated in appState.history, so renderResultDetails will work
    renderResultDetails(newHistoryEntry.id);
    navigateTo('result-details', true);
}


// --- 7. HISTORY & RESULTS RENDERING ---

/**
 * Renders the list of all past quiz attempts.
 */
function renderHistorySummary() {
    // Reload history from localStorage just in case another window/tab updated it
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

/**
 * Deletes a history entry by ID.
 * @param {number} id - The ID of the history entry to delete.
 */
function deleteHistoryEntry(id) {
    if (confirm("Are you sure you want to permanently delete this quiz history?")) {
        appState.history = appState.history.filter(item => item.id !== id);
        localStorage.setItem('quizHistory', JSON.stringify(appState.history));
        renderHistorySummary(); // RE-RENDER to update the list immediately
    }
}

/**
 * Renders the detailed results and review for a specific quiz history entry.
 * @param {number} id - The ID of the history entry.
 */
function renderResultDetails(id) {
    const historyEntry = appState.history.find(item => item.id === id);
    if (!historyEntry) {
        alert('Result not found. History may have been cleared.');
        navigateTo('result-summary', true);
        return;
    }

    // 1. Render Summary Metrics
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

    // 2. Render Detailed Review
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

// --- 8. INITIALIZATION & EVENT LISTENERS ---

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
            // Check if subject exists before accessing its properties
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
    // General Navigation
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Use e.currentTarget to safely get data-view from the <a> tag
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
    DOM.stayQuizBtn.addEventListener('click', () => {
        DOM.restrictionModal.classList.add('hidden');
    });
    DOM.cancelQuizBtn.addEventListener('click', () => {
        if (appState.currentQuiz.timerId) clearInterval(appState.currentQuiz.timerId);
        appState.isQuizActive = false;
        appState.currentQuiz = {};
        appState.pausedByTabSwitch = false;
        
        // Find the view that was attempted to navigate to
        // NOTE: This logic assumes a single link was clicked before the modal appeared.
        // A more robust solution stores the clicked viewId in a temporary state variable.
        const targetViewId = DOM.navLinks.find(link => !link.classList.contains('active'))?.dataset.view || 'home';
        DOM.restrictionModal.classList.add('hidden');
        navigateTo(targetViewId, true);
    });

    // Start Quiz Buttons (Simplified for brevity, assuming original logic is correct)
    DOM.startSubjectQuiz.addEventListener('click', () => {
        const selectedTopics = Array.from(DOM.topicsContainer.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        if (!DOM.subjectSelect.value || selectedTopics.length === 0) {
            alert('Please select a Subject and at least one Topic.');
            return;
        }
        startQuiz('subject', { subject: DOM.subjectSelect.value, topics: selectedTopics, numQ: DOM.numQuestions.value, timer: DOM.timerMinutes.value });
    });
    DOM.startDailyQuiz.addEventListener('click', () => {
         startQuiz('daily', { subject: 'Mixed', topics: null, numQ: document.getElementById('daily-num-questions').value, timer: document.getElementById('daily-timer-minutes').value });
    });
    DOM.startMockQuiz.addEventListener('click', () => {
        if (!DOM.mockSubjectSelect.value) {
            alert('Please select a Subject for the Full Mock.');
            return;
        }
        startQuiz('mock', { subject: DOM.mockSubjectSelect.value, topics: null, numQ: document.getElementById('mock-num-questions').value, timer: document.getElementById('mock-timer-minutes').value });
    });

    // Active Quiz Controls (Unchanged)
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
    
    // Pause/Resume Logic (Unchanged)
    DOM.pauseResumeBtn.addEventListener('click', () => {
        if (appState.currentQuiz.paused) {
            startTimer();
        } else {
            pauseTimer(false); // Manual pause, not tab switch
        }
    });
    document.addEventListener('visibilitychange', () => {
        if (appState.isQuizActive && !appState.currentQuiz.paused && document.hidden) {
            pauseTimer(true); // Tab switched away -> Pause + Black Screen
        }
    });
    DOM.resumeOverlayBtn.addEventListener('click', () => {
        appState.pausedByTabSwitch = false;
        DOM.pauseOverlay.classList.add('hidden');
        startTimer();
    });

    // ------------------------------------------------------------------
    // HISTORY AND RESULTS ACTIONS (FIXED EVENT DELEGATION)
    // ------------------------------------------------------------------
    DOM.historyList.addEventListener('click', (e) => {
        // Use .closest() to find the relevant button element (or its icon/text child)
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
    // ------------------------------------------------------------------
    
    DOM.backToSummaryBtn.addEventListener('click', () => {
        navigateTo('result-summary', true);
    });
}

// --- 9. APPLICATION STARTUP ---

function initApp() {
    initializeSetupScreens();
    setupEventListeners();
    navigateTo('home', true); // Start on the home screen
}

initApp();