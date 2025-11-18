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
        "Simplification": [
            
    {
        id: "q-ar-021",
        question: "25% of 640 + 35% of 480 – 10% of 900 = ?",
        image: null,
        options: ["(a) 238","(b) 240","(c) 242","(d) 232"],
        answer: "(a) 238",
        explanation: "25% of 640 = 160, 35% of 480 = 168, 10% of 900 = 90 ⇒ 160 + 168 – 90 = 238",
    },
    {
        id: "q-ar-022",
        question: "(7/8 × 96) + (2/5 × 250) – 15 = ?²",
        image: null,
        options: ["(a) 11","(b) 12","(c) 13","(d) 14"],
        answer: "(c) 13",
        explanation: "(7/8 × 96) = 84, (2/5 × 250) = 100 ⇒ 84 + 100 – 15 = 169 ⇒ ? = 13",
    },
    {
        id: "q-ar-023",
        question: "48² + 26² – 34² = ?",
        image: null,
        options: ["(a) 1824","(b) 1724","(c) 1924","(d) 1814"],
        answer: "(a) 1824",
        explanation: "48² = 2304, 26² = 676 ⇒ 2304 + 676 = 2980, 2980 – 1156 = 1824",
    },
    {
        id: "q-ar-024",
        question: "√1600 × √225 – 450 = ?",
        image: null,
        options: ["(a) 150","(b) 140","(c) 160","(d) 180"],
        answer: "(a) 150",
        explanation: "√1600 = 40, √225 = 15 ⇒ 40 × 15 = 600 ⇒ 600 – 450 = 150",
    },
    {
        id: "q-ar-025",
        question: "(1560 ÷ 12) + (625 ÷ 25) – 12² = ?",
        image: null,
        options: ["(a) 11","(b) 21","(c) 10","(d) 14"],
        answer: "(a) 11",
        explanation: "1560/12 = 130, 625/25 = 25, 12² = 144 ⇒ 130 + 25 – 144 = 11",
    },
    {
        id: "q-ar-026",
        question: "60% of (250 + 150) + 39 = ?",
        image: null,
        options: ["(a) 279","(b) 289","(c) 269","(d) 281"],
        answer: "(a) 279",
        explanation: "250 + 150 = 400 ⇒ 60% × 400 = 240 ⇒ 240 + 39 = 279",
    },
    {
        id: "q-ar-027",
        question: "18 × 14 – 35 × 7 + 8 × 19 = ?",
        image: null,
        options: ["(a) 159","(b) 149","(c) 169","(d) 179"],
        answer: "(a) 159",
        explanation: "18×14 = 252, 35×7 = 245, 8×19 = 152 ⇒ 252 – 245 + 152 = 159",
    },
    {
        id: "q-ar-028",
        question: "(90 ÷ 6)³ ÷ 125 = ?",
        image: null,
        options: ["(a) 25","(b) 27","(c) 29","(d) 30"],
        answer: "(b) 27",
        explanation: "90/6 = 15 ⇒ 15³ = 3375 ⇒ 3375/125 = 27",
    },
    {
        id: "q-ar-029",
        question: "(√2916 + 24) × 5 = ?",
        image: null,
        options: ["(a) 380","(b) 395","(c) 390","(d) 400"],
        answer: "(c) 390",
        explanation: "√2916 = 54 ⇒ 54 + 24 = 78 ⇒ 78 × 5 = 390",
    },
    {
        id: "q-ar-030",
        question: "(3/4 of 320) + (4/5 of 200) – (1/2 of 180) = ?",
        image: null,
        options: ["(a) 310","(b) 300","(c) 315","(d) 305"],
        answer: "(a) 310",
        explanation: "(3/4 × 320) = 240, (4/5 × 200) = 160, (1/2 × 180) = 90 ⇒ 240 + 160 – 90 = 310",
    },
    {
        id: "q-ar-001",
        question: "44% of 750 + 18% of 550 + 38.45% of 767 = ?",
        image: null,
        options: ["(a) 796","(b) 792","(c) 797","(d) 724"],
        answer: "(d) 724",
        explanation: "44% of 750 = 330, 18% of 550 = 99, 38.45% of 767 ≈ 295. Sum = 330 + 99 + 295 = 724",
    },
    {
        id: "q-ar-002",
        question: "(7/9) of 405 + (7/18) of 1530 – (3/17) of 1615 = ?²",
        image: null,
        options: ["(a) 24","(b) 25","(c) 26","(d) 20"],
        answer: "(b) 25",
        explanation: "7/9 of 405 = 315, 7/18 of 1530 = 595, 3/17 of 1615 = 285, 315 + 595 – 285 = 625, √625 = 25",
    },
    {
        id: "q-ar-003",
        question: "(108 × 24) + 48² + 72² = ? + 17²",
        image: null,
        options: ["(a) 9791","(b) 9998","(c) 9794","(d) 9996"],
        answer: "(a) 9791",
        explanation: "108 × 24 = 2592, 48² = 2304, 72² = 5184, Sum = 10080, ? + 289 = 10080, ? = 9791",
    },
    {
        id: "q-ar-004",
        question: "18 × 4.5 – 28 × 3.5 – 75 × 4 + 36 × 9.5 = ?",
        image: null,
        options: ["(a) 25","(b) 23","(c) 24","(d) 20"],
        answer: "(a) 25",
        explanation: "81 – 98 – 300 + 342 = 25",
    },
    {
        id: "q-ar-005",
        question: "(√3136 × √1296) ÷ √12544 + 175 = ?",
        image: null,
        options: ["(a) 198","(b) 190","(c) 199","(d) 193"],
        answer: "(d) 193",
        explanation: "√3136 = 56, √1296 = 36, √12544 = 112, (56×36)/112 = 18, 18 + 175 = 193",
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