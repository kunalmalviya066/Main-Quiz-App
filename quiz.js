// quiz.js
// Core Quiz Engine Logic (State Management)

let quizState = {
    questions: [],
    currentQIndex: 0,
    answers: [], // Array of { id: questionId, selectedChoice: string, isReviewed: boolean, qTimeTaken: number }
    totalTimeElapsed: 0,
    isPaused: false,
    intervalId: null,
};

// Helper function to format time (MM:SS)
const formatTime = (totalSeconds) => {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
};

// Start the global timer
const startTimer = (updateTotalTimerDisplay, updateQuestionTimerDisplay) => {
    if (quizState.intervalId) clearInterval(quizState.intervalId);

    let currentQTime = 0;
    
    // Initialize question time for all questions
    if (quizState.answers.length !== quizState.questions.length) {
         quizState.answers = quizState.questions.map(q => ({
             id: q.id, 
             selectedChoice: null, 
             isReviewed: false, 
             qTimeTaken: 0 
         }));
    } else {
        // Resume from previous state
        currentQTime = quizState.answers[quizState.currentQIndex].qTimeTaken;
    }

    quizState.intervalId = setInterval(() => {
        if (quizState.isPaused) return;

        quizState.totalTimeElapsed++;
        currentQTime++;
        
        // Update the current question's time taken
        quizState.answers[quizState.currentQIndex].qTimeTaken = currentQTime;

        updateTotalTimerDisplay(formatTime(quizState.totalTimeElapsed));
        updateQuestionTimerDisplay(formatTime(currentQTime));

        // Note: Individual question timer reset is handled in the navigateToQuestion function.
    }, 1000);
};

const pauseTimer = () => {
    quizState.isPaused = true;
};

const resumeTimer = (updateTotalTimerDisplay, updateQuestionTimerDisplay) => {
    quizState.isPaused = false;
    // Restart the interval to continue the count
    startTimer(updateTotalTimerDisplay, updateQuestionTimerDisplay); 
};

// Public facing functions for the Quiz Engine
export const QuizEngine = {
    init: (questions) => {
        // Shuffle choices for each question
        const shuffledQuestions = questions.map(q => {
            const choices = q.choices.slice(); // Copy array
            for (let i = choices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [choices[i], choices[j]] = [choices[j], choices[i]];
            }
            return { ...q, choices };
        });

        quizState = {
            questions: shuffledQuestions,
            currentQIndex: 0,
            answers: [],
            totalTimeElapsed: 0,
            isPaused: false,
            intervalId: null,
        };
    },

    start: (updateTotalTimerDisplay, updateQuestionTimerDisplay) => {
        startTimer(updateTotalTimerDisplay, updateQuestionTimerDisplay);
        return quizState.questions[0]; // Return the first question
    },

    stop: () => {
        if (quizState.intervalId) clearInterval(quizState.intervalId);
        quizState.intervalId = null;
    },

    getState: () => quizState,

    getCurrentQuestion: () => quizState.questions[quizState.currentQIndex],

    getTotalQuestions: () => quizState.questions.length,

    // Navigation and Timer Reset Logic
    navigateToQuestion: (index, updateQuestionTimerDisplay) => {
        if (index >= 0 && index < quizState.questions.length) {
            quizState.currentQIndex = index;
            
            // Reset question timer display
            const qTime = quizState.answers[index].qTimeTaken;
            updateQuestionTimerDisplay(formatTime(qTime));
            
            return quizState.questions[index];
        }
        return null;
    },

    // Answer Handling
    saveAnswer: (choice) => {
        quizState.answers[quizState.currentQIndex].selectedChoice = choice;
    },

    toggleReview: () => {
        const isReviewed = !quizState.answers[quizState.currentQIndex].isReviewed;
        quizState.answers[quizState.currentQIndex].isReviewed = isReviewed;
        return isReviewed;
    },

    // Pause/Resume
    togglePause: (updateTotalTimerDisplay, updateQuestionTimerDisplay) => {
        if (quizState.isPaused) {
            resumeTimer(updateTotalTimerDisplay, updateQuestionTimerDisplay);
            return false; // Not paused
        } else {
            pauseTimer();
            return true; // Paused
        }
    },
    
    // Final Scoring and Results Calculation
    calculateResults: (quizTitle) => {
        QuizEngine.stop(); // Stop the timer

        let correctCount = 0;
        let attemptedCount = 0;
        
        const reviewDetails = quizState.questions.map((q, index) => {
            const userAnswer = quizState.answers[index].selectedChoice;
            const isCorrect = userAnswer === q.answer;

            if (userAnswer) {
                attemptedCount++;
                if (isCorrect) correctCount++;
            }

            return {
                ...q,
                userAnswer: userAnswer,
                isCorrect: isCorrect,
                attempted: !!userAnswer,
            };
        });

        const totalQuestions = quizState.questions.length;
        const totalMarks = totalQuestions; 
        const unattemptedCount = totalQuestions - attemptedCount;
        const accuracyRate = totalQuestions > 0 ? ((correctCount / attemptedCount) * 100).toFixed(2) : 0;
        
        const results = {
            title: quizTitle,
            correct: correctCount,
            totalMarks: totalMarks,
            accuracy: accuracyRate,
            attempted: attemptedCount,
            unattempted: unattemptedCount,
            totalTime: formatTime(quizState.totalTimeElapsed),
            reviewDetails: reviewDetails
        };
        
        return results;
    }
};