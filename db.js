/*
 * ============================================
 * FILE: db.js
 * DESCRIPTION: Stores all subject, topic, and question data.
 * ============================================
 */

const quizDB = {
    // --- GENERAL KNOWLEDGE ---
    "General Knowledge": {
        "Indian History": [
            {
                id: 101,
                question: "Who was the first Governor-General of independent India?",
                image: null, // Set to 'path/to/image.jpg' if an image is needed
                options: ["Lord Mountbatten", "C. Rajagopalachari", "Jawaharlal Nehru", "Dr. Rajendra Prasad"],
                answer: "C. Rajagopalachari",
                explanation: "Chakravarti Rajagopalachari (CR) was the only Indian and the last Governor-General of India.",
            },
            {
                id: 102,
                question: "The famous 'Dandi March' was associated with which movement?",
                image: null,
                options: ["Non-Cooperation Movement", "Civil Disobedience Movement", "Quit India Movement", "Swadeshi Movement"],
                answer: "Civil Disobedience Movement",
                explanation: "The Dandi March (or Salt Satyagraha) was an act of nonviolent civil disobedience in colonial India led by Mahatma Gandhi.",
            },
        ],
        "Indian Polity": [
            {
                id: 201,
                question: "Which part of the Indian Constitution deals with Fundamental Rights?",
                image: null,
                options: ["Part I", "Part II", "Part III", "Part IV"],
                answer: "Part III",
                explanation: "Part III (Articles 12-35) of the Constitution of India deals with Fundamental Rights.",
            },
            {
                id: 202,
                question: "How many schedules are there in the Constitution of India?",
                image: null,
                options: ["10", "12", "8", "14"],
                answer: "12",
                explanation: "Originally, the Constitution had 8 schedules. Currently, there are 12 schedules.",
            },
        ],
    },

    // --- QUANTITATIVE APTITUDE ---
    "Quantitative Aptitude": {
        "Number System": [
            {
                id: 301,
                question: "If 10 men can complete a piece of work in 7 days, how many men are required to complete the same work in 10 days?",
                image: null,
                options: ["7", "10", "12", "15"],
                answer: "7",
                explanation: "Using the formula M1*D1 = M2*D2. (10 * 7) = (M2 * 10). M2 = 70/10 = 7 men.",
            },
        ],
        "Averages": [
            {
                id: 401,
                question: "The average age of 5 students is 15 years. If a new student is added, the average age becomes 16 years. What is the age of the new student?",
                image: null,
                options: ["18 years", "21 years", "20 years", "22 years"],
                answer: "21 years",
                explanation: "Total age of 5 students: 5 * 15 = 75. Total age of 6 students: 6 * 16 = 96. Age of new student: 96 - 75 = 21 years.",
            },
        ],
    },

    // --- REASONING EXAMPLE (WITH IMAGE) ---
    "Reasoning": {
        "Non-Verbal Reasoning": [
            {
                id: 501,
                question: "Identify the next figure in the series.",
                image: 'images/figure_series_1.png', // Placeholder path for an image
                options: ["Figure A", "Figure B", "Figure C", "Figure D"],
                answer: "Figure C",
                explanation: "The figure rotates 90 degrees clockwise at each step.",
            },
        ]
    }
};