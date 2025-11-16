// script.js
import { db } from './db.js';
import { QuizEngine } from './quiz.js';

// --- DOM Elements ---
const selectionSection = document.getElementById('selection-section');
const quizSection = document.getElementById('quiz-section');
const resultsSection = document.getElementById('results-section');
const selectionPanel = document.getElementById('quiz-selection-panel');
const startTestBtn = document.getElementById('start-test-btn');
const totalTimerEl = document.getElementById('total-timer');
const questionTimerEl = document.getElementById('question-timer');
const questionTextEl = document.getElementById('question-text');
const questionImageEl = document.getElementById('question-image');
const choicesContainer = document.getElementById('choices-container');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const markReviewBtn = document.getElementById('mark-review-btn');
const navigatorGrid = document.getElementById('navigator-grid');
const pauseResumeBtn = document.getElementById('pause-resume-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let selectedSubjectId = null;
let selectedTopicId = null;
let currentQuizTitle = '';

// --- Utility Functions ---

// Renders Subjects and Topics as selectable cards
function renderSelectionPanel() {
    const subjects = db.getSubjects();
    const topics = db.getTopics();
    let html = '';

    subjects.forEach(subject => {
        html += `
            <div class="card selection-card" data-id="${subject.id}" data-type="subject">
                <h3>${subject.name}</h3>
                <div style="font-size: 0.9em; margin-top: 10px;">
        `;
        
        topics.filter(t => t.subjectId === subject.id).forEach(topic => {
            html += `<label style="display: block; margin: 5px 0;">
                        <input type="checkbox" data-id="${topic.id}" data-name="${topic.name}" class="topic-checkbox">
                        ${topic.name}
                     </label>`;
        });

        html += '</div></div>';
    });

    selectionPanel.innerHTML = html;
    
    // Add event listeners for topic selection
    document.querySelectorAll('.topic-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateTestBuilderStatus);
    });
    
    // Load and render history
    renderHistory();
}

// Updates the start button based on selected topics
function updateTestBuilderStatus() {
    const selectedTopics = Array.from(document.querySelectorAll('.topic-checkbox:checked'));
    const totalQuestions = db.getQuestions().filter(q => 
        selectedTopics.some(t => t.dataset.id === q.topicId)
    ).length;

    if (totalQuestions > 0) {
        startTestBtn.disabled = false;
        startTestBtn.textContent = `Start Custom Test (${totalQuestions} Questions)`;
    } else {
        startTestBtn.disabled = true;
        startTestBtn.textContent = `Start Custom Test (0 Questions)`;
    }
}

// Renders the current question in the quiz section
function renderQuestion(question, answers) {
    const state = QuizEngine.getState();
    const currentAnswer = answers[state.currentQIndex];
    
    questionTextEl.innerHTML = question.question;
    document.getElementById('current-q-index').textContent = state.currentQIndex + 1;
    
    // Image support
    if (question.imgUrl) {
        questionImageEl.src = question.imgUrl;
        questionImageEl.style.display = 'block';
    } else {
        questionImageEl.style.display = 'none';
    }

    // Choices (with shuffle handled by QuizEngine.init)
    choicesContainer.innerHTML = question.choices.map((choice, index) => `
        <label>
            <input type="radio" name="choice" value="${choice}" ${currentAnswer.selectedChoice === choice ? 'checked' : ''}>
            <span>${String.fromCharCode(65 + index)}. ${choice}</span>
        </label>
    `).join('');
    
    // Add event listeners for choice selection
    document.querySelectorAll('input[name="choice"]').forEach(radio => {
        radio.addEventListener('change', (e) => QuizEngine.saveAnswer(e.target.value));
    });

    // Navigation buttons state
    prevBtn.disabled = state.currentQIndex === 0;
    
    if (state.currentQIndex === state.questions.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }
    
    // Review button state
    markReviewBtn.textContent = currentAnswer.isReviewed ? 'Unmark Review' : 'Mark for Review';
    markReviewBtn.classList.toggle('btn-warning', !currentAnswer.isReviewed);
    markReviewBtn.classList.toggle('btn-secondary', currentAnswer.isReviewed);
    
    // Update Navigator
    renderNavigator();
}

// Renders the question navigation panel
function renderNavigator() {
    const state = QuizEngine.getState();
    navigatorGrid.innerHTML = state.questions.map((q, index) => {
        const answer = state.answers[index];
        let className = 'nav-item';
        
        if (index === state.currentQIndex) className += ' current';
        if (answer.selectedChoice) className += ' attempted';
        if (answer.isReviewed) className += ' review';
        
        return `<div class="${className}" data-index="${index}">${index + 1}</div>`;
    }).join('');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            const question = QuizEngine.navigateToQuestion(index, updateQuestionTimerDisplay);
            renderQuestion(question, state.answers);
        });
    });
}

// Global timer display update function (passed to QuizEngine)
function updateTotalTimerDisplay(time) {
    totalTimerEl.textContent = time;
}

// Question timer display update function (passed to QuizEngine)
function updateQuestionTimerDisplay(time) {
    questionTimerEl.textContent = time;
}

// --- Main Quiz Flow Handlers ---

function startQuiz(questions, title) {
    if (questions.length === 0) {
        alert("No questions found for the selected criteria!");
        return;
    }

    currentQuizTitle = title;
    
    // Hide selection, show quiz
    selectionSection.style.display = 'none';
    resultsSection.style.display = 'none';
    quizSection.style.display = 'block';

    // Initialize the engine
    QuizEngine.init(questions);
    
    document.getElementById('quiz-title').textContent = currentQuizTitle;
    document.getElementById('total-q-count').textContent = QuizEngine.getTotalQuestions();

    // Start timer and render first question
    const firstQuestion = QuizEngine.start(updateTotalTimerDisplay, updateQuestionTimerDisplay);
    renderQuestion(firstQuestion, QuizEngine.getState().answers);
}

function handleStartCustomTest() {
    const selectedTopics = Array.from(document.querySelectorAll('.topic-checkbox:checked'))
                                 .map(cb => cb.dataset.id);

    if (selectedTopics.length === 0) {
        alert("Please select at least one topic.");
        return;
    }

    const questions = db.getQuestions().filter(q => selectedTopics.includes(q.topicId));
    
    const topicNames = Array.from(document.querySelectorAll('.topic-checkbox:checked'))
                             .map(cb => cb.dataset.name);
    
    const title = topicNames.length === 1 ? topicNames[0] : `${topicNames.length} Topics`;
    
    startQuiz(questions, `Custom Test: ${title}`);
}

function handleDailyQuiz() {
    const allQuestions = db.getQuestions();
    
    // Simple shuffle and take top 10
    const shuffledQuestions = allQuestions.slice().sort(() => 0.5 - Math.random());
    const dailyQuestions = shuffledQuestions.slice(0, 10);
    
    startQuiz(dailyQuestions, 'Daily Quiz (Random 10)');
}

function navigate(direction) {
    const state = QuizEngine.getState();
    const newIndex = state.currentQIndex + direction;

    const question = QuizEngine.navigateToQuestion(newIndex, updateQuestionTimerDisplay);
    if (question) {
        renderQuestion(question, state.answers);
    }
}

function handleSubmit() {
    if (!confirm('Are you sure you want to submit the test?')) return;
    
    const results = QuizEngine.calculateResults(currentQuizTitle);
    
    // Save to history
    db.addHistory(results);
    
    renderResults(results);
}

function renderResults(results) {
    // Hide quiz, show results
    quizSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Populate stats
    document.getElementById('results-title').textContent = results.title;
    document.getElementById('final-score').textContent = results.correct;
    document.getElementById('total-marks').textContent = results.totalMarks;
    document.getElementById('accuracy-rate').textContent = `${results.accuracy}%`;
    document.getElementById('attempted-count').textContent = results.attempted;
    document.getElementById('total-q-count-result').textContent = results.totalMarks;
    document.getElementById('time-taken-result').textContent = results.totalTime;
    
    // Populate review section
    const reviewContainer = document.getElementById('review-container');
    reviewContainer.innerHTML = results.reviewDetails.map((q, index) => {
        let reviewClass = 'review-unattempted';
        if (q.attempted) {
            reviewClass = q.isCorrect ? 'review-correct' : 'review-incorrect';
        }
        
        return `
            <div class="review-question ${reviewClass}">
                <p><strong>Q${index + 1}.</strong> ${q.question}</p>
                ${q.imgUrl ? `<img src="${q.imgUrl}" class="question-img" style="max-height: 100px;">` : ''}
                <p><strong>Your Answer:</strong> ${q.userAnswer || 'Unattempted'}</p>
                <p><strong>Correct Answer:</strong> ${q.answer}</p>
                <p><strong>Explanation:</strong> ${q.explanation}</p>
            </div>
        `;
    }).join('');
}

function renderHistory() {
    const history = db.getHistory().reverse(); // Show most recent first
    const historyList = document.getElementById('history-list');

    if (history.length === 0) {
        historyList.innerHTML = '<p>No tests recorded yet.</p>';
        return;
    }

    historyList.innerHTML = history.map(h => {
        const date = new Date(h.timestamp).toLocaleString();
        return `
            <li>
                <span>${date} | ${h.title}</span>
                <span>
                    Score: ${h.correct}/${h.totalMarks} | Accuracy: ${h.accuracy}%
                    <button class="btn btn-secondary btn-sm" onclick='showHistoryReview(${JSON.stringify(h)})'>Review</button>
                </span>
            </li>
        `;
    }).join('');
    
    // Attach the review function globally (since it's an inline onclick)
    window.showHistoryReview = (h) => {
        selectionSection.style.display = 'none';
        renderResults(h);
    };
}

// --- Event Listeners and Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    renderSelectionPanel();
    
    startTestBtn.addEventListener('click', handleStartCustomTest);
    document.getElementById('daily-quiz-btn').addEventListener('click', handleDailyQuiz);

    prevBtn.addEventListener('click', () => navigate(-1));
    nextBtn.addEventListener('click', () => navigate(1));
    submitBtn.addEventListener('click', handleSubmit);
    
    markReviewBtn.addEventListener('click', () => {
        QuizEngine.toggleReview();
        renderQuestion(QuizEngine.getCurrentQuestion(), QuizEngine.getState().answers);
    });
    
    pauseResumeBtn.addEventListener('click', () => {
        const isPaused = QuizEngine.togglePause(updateTotalTimerDisplay, updateQuestionTimerDisplay);
        pauseResumeBtn.textContent = isPaused ? 'Resume' : 'Pause';
    });

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    });
});