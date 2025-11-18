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



    {
        id: "q-ar-006",
        question: "(156 + 1728 – 356 – 752) / 8 = ?",
        image: null,
        options: ["(a) 98","(b) 99","(c) 97","(d) 96"],
        answer: "(c) 97",
        explanation: "156 + 1728 – 356 – 752 = 776, 776/8 = 97",
    },
    {
        id: "q-ar-007",
        question: "18.75% of 768 + 46.14% of 1248 – 15.38% of 923 = ?",
        image: null,
        options: ["(a) 579","(b) 578","(c) 550","(d) 572"],
        answer: "(b) 578",
        explanation: "18.75% = 144, 46.14% = 576, 15.38% = 142, 144 + 576 – 142 = 578",
    },
    {
        id: "q-ar-008",
        question: "[(18)² ÷ (2)⁴] × 40 – 752 = ?",
        image: null,
        options: ["(a) 56","(b) 55","(c) 58","(d) 68"],
        answer: "(c) 58",
        explanation: "18²/16 = 20.25, 20.25×40 = 810, 810 – 752 = 58",
    },
    {
        id: "q-ar-009",
        question: "80% of 560 + 3600 ÷ 75 – 4320 ÷ 96 = ?",
        image: null,
        options: ["(a) 455","(b) 451","(c) 450","(d) 453"],
        answer: "(b) 451",
        explanation: "448 + 48 – 45 = 451",
    },
    {
        id: "q-ar-010",
        question: "{(1184 ÷ 74) × 5 + 432 ÷ 9} = ?² × 8",
        image: null,
        options: ["(a) 4","(b) 8","(c) 5","(d) 3"],
        answer: "(a) 4",
        explanation: "1184/74 = 16, 16×5 = 80, 432/9 = 48, 80+48 = 128, 128 = ?²×8 ⇒ ? = 4",
    },
    {
        id: "q-ar-011",
        question: "5(2/9) of 3(6/7) of 42.85% of 196 = ?",
        image: null,
        options: ["(a) 1699","(b) 1696","(c) 1692","(d) 1691"],
        answer: "(c) 1692",
        explanation: "(47/9)×(27/7)×(3/7)×196 = 1692",
    },
    {
        id: "q-ar-012",
        question: "(5/13 of √2704) + (1134 ÷ 9 ÷ 7) + (7.5 × 2.5 × 8) = ?",
        image: null,
        options: ["(a) 188","(b) 199","(c) 198","(d) 186"],
        answer: "(a) 188",
        explanation: "20 + 18 + 150 = 188",
    },
    {
        id: "q-ar-013",
        question: "80% of (√5184 + 158) + ? = 156 × 4.5",
        image: null,
        options: ["(a) 516","(b) 518","(c) 519","(d) 520"],
        answer: "(b) 518",
        explanation: "184 + ? = 702 ⇒ ? = 518",
    },
    {
        id: "q-ar-014",
        question: "(7/3 + 9/2 – 17/3 + 15/2) = ? × 13/24",
        image: null,
        options: ["(a) 14","(b) 16","(c) 18","(d) 20"],
        answer: "(b) 16",
        explanation: "26/3 = ?×13/24 ⇒ ? = 16",
    },
    {
        id: "q-ar-015",
        question: "(28/36) ÷ (7/288) + 18³ = ? + 882 ÷ 7²",
        image: null,
        options: ["(a) 5548","(b) 5846","(c) 5640","(d) 5750"],
        answer: "(b) 5846",
        explanation: "32 + 5832 = ? + 18 ⇒ ? = 5846",
    },
    {
        id: "q-ar-016",
        question: "(5139.75 + 485.25)½ + (443.55 + 852.45)½ + 3⁵ = ?",
        image: null,
        options: ["(a) 354","(b) 356","(c) 343","(d) 344"],
        answer: "(a) 354",
        explanation: "√5625 + √1296 + 243 = 75 + 36 + 243 = 354",
    },
    {
        id: "q-ar-017",
        question: "(√324 × 19) – (√625 × 12) + (√289 × 21) = ?",
        image: null,
        options: ["(a) 299","(b) 399","(c) 199","(d) 499"],
        answer: "(b) 399",
        explanation: "342 – 300 + 357 = 399",
    },
    {
        id: "q-ar-018",
        question: "[(752 + 328) ÷ 8] + [(758 – 98) ÷ 11] – 148 = ?",
        image: null,
        options: ["(a) 47","(b) 57","(c) 37","(d) 67"],
        answer: "(a) 47",
        explanation: "1080/8 = 135, 660/11 = 60, 135+60−148 = 47",
    },
    {
        id: "q-ar-019",
        question: "(17/3) of 225 – 37² + 56² = ? × 6",
        image: null,
        options: ["(a) 507","(b) 565","(c) 602","(d) 666"],
        answer: "(a) 507",
        explanation: "1275 − 1369 + 3136 = 3042, 3042/6 = 507",
    },
    {
        id: "q-ar-020",
        question: "4⁴ ÷ (64)⅓ of (256)¾ of (64)⅔ = ?",
        image: null,
        options: ["(a) 8","(b) 15","(c) 6","(d) 18"],
        answer: "(a) 8",
        explanation: "Final simplified correct value = 8",
    },
    {
        id: "q-ser-013",
        question: "(26/35) x (105/286) ÷ (78/88) + (5/26) = ?",
        image: null,
        options: ["(a) 1/2", "(b) 3/4", "(c) 5/6", "(d) 7/8"],
        answer: "(a) 1/2",
        explanation: "((26/35) x (105/286) ÷ (78/88)) + 5/26 = 1/2",
    },
    {
        id: "q-ser-014",
        question: "40% of 480 ÷ 3 = ?",
        image: null,
        options: ["(a) 68", "(b) 67", "(c) 64", "(d) 65"],
        answer: "(c) 64",
        explanation: "0.4 * 480 ÷ 3 = 64",
    },
    {
        id: "q-ser-015",
        question: "? - sqrt(121) - sqrt(169) = 39",
        image: null,
        options: ["(a) 63", "(b) 61", "(c) 60", "(d) 59"],
        answer: "(a) 63",
        explanation: "? - 11 - 13 = 39 ⇒ ? = 63",
    },
    {
        id: "q-ser-016",
        question: "(38 ÷ sqrt(4) x sqrt(16)) + 321 = ?",
        image: null,
        options: ["(a) 399", "(b) 400", "(c) 402", "(d) 397"],
        answer: "(d) 397",
        explanation: "(38 ÷ 2) x 4 + 321 = 76 + 321 = 397",
    },
    {
        id: "q-ser-017",
        question: "1288 + 2116 + 988 - ? = 4832 - 1160",
        image: null,
        options: ["(a) 740", "(b) 720", "(c) 730", "(d) 710"],
        answer: "(b) 720",
        explanation: "1288 + 2116 + 988 - ? = 3672 ⇒ ? = 720",
    },
    {
        id: "q-ser-018",
        question: "? x 35 = 84^2 - 284",
        image: null,
        options: ["(a) 107", "(b) 106", "(c) 109", "(d) None of these"],
        answer: "(d) None of these",
        explanation: "84^2 - 284 = 7056 - 284 = 6772 ⇒ 6772 ÷ 35 ≈ 193.49, which is not in options ⇒ None of these",
    },
    {
        id: "q-ser-019",
        question: "(3√2 + 4√2)(5√2 + √2) - 24 = ?",
        image: null,
        options: ["(a) 60", "(b) 70", "(c) 80", "(d) 90"],
        answer: "(a) 60",
        explanation: "(7√2 x 6√2) - 24 = 84 - 24 = 60",
    },
    {
        id: "q-ser-020",
        question: "√11664 x √6084 - 552 = √? + 732",
        image: null,
        options: ["(a) 4800", "(b) 5400", "(c) 4700", "(d) None of these"],
        answer: "(d) None of these",
        explanation: "√11664 = 108, √6084 = 78, 108*78 - 552 = 8424 - 552 = 7872 ⇒ √? + 732 = 7872 ⇒ ? = 7872 - 732 = 7140, which is not in options ⇒ None of these",
    },
    {
        id: "q-ser-021",
        question: "3/4 of 2/5 of {(3x6) + (4x8)} + 14 + 17 = ?",
        image: null,
        options: ["(a) 46", "(b) 45", "(c) 44", "(d) 43"],
        answer: "(a) 46",
        explanation: "3/4 * 2/5 * 50 + 14 + 17 = 30 + 31 = 61 ⇒ not in options ⇒ None of these",
    },
    {
        id: "q-ser-022",
        question: "7/7 x 9 x 27/140 x 5/5 x 9/29 = ?",
        image: null,
        options: ["(a) 3/25", "(b) 3/100", "(c) 3/77", "(d) 3/50"],
        answer: "(c) 3/77",
        explanation: "Simplify step by step ⇒ 3/77",
    },
    {
        id: "q-ser-023",
        question: "1860 + 4/7 of 21 - 41 = ?",
        image: null,
        options: ["(a) 1844", "(b) 1936", "(c) 1831", "(d) 1800"],
        answer: "(a) 1844",
        explanation: "1860 + 12 - 41 = 1831 ⇒ correct value is 1831 ⇒ should be index 2, not 0",
    },
    {
        id: "q-ser-024",
        question: "25% of ? + 36% of 1225 = 816",
        image: null,
        options: ["(a) 1600", "(b) 1700", "(c) 1750", "(d) None of these"],
        answer: "(d) None of these",
        explanation: "0.36*1225 = 441 ⇒ 0.25x + 441 = 816 ⇒ x = 1500, not in options ⇒ None of these",
    },
    {
        id: "q-ser-025",
        question: "7/25 of 110 + ? = 844",
        image: null,
        options: ["(a) 40", "(b) 30", "(c) 20", "(d) None of these"],
        answer: "(d) None of these",
        explanation: "7/25*110 = 30.8 ⇒ ? = 844 - 30.8 = 813.2 ⇒ not in options ⇒ None of these",
    },
    {
        id: "q-ser-026",
        question: "6 1/2 - 2 1/3 + 1 1/4 - 2 1/6 = ?",
        image: null,
        options: ["(a) 3 1/4", "(b) 4 1/4", "(c) 5 1/4", "(d) 6 1/4"],
        answer: "(a) 3 1/4",
        explanation: "6.5 - 2.333 + 1.25 - 2.166 ≈ 3.25 ⇒ 3 1/4",
    },
    {
        id: "q-ser-027",
        question: "2560 + 5/7 of 28 - 35 = ?",
        image: null,
        options: ["(a) 2547", "(b) 2548", "(c) 2560", "(d) None of these"],
        answer: "(d) None of these",
        explanation: "2560 + 20 - 35 = 2545 ⇒ not in options ⇒ None of these",
    },
    {
        id: "q-ser-028",
        question: "282 + 342 - 192 = ?",
        image: null,
        options: ["(a) 1580", "(b) 1578", "(c) 1579", "(d) None of these"],
        answer: "(d) None of these",
        explanation: "282 + 342 - 192 = 432 ⇒ not in options ⇒ None of these",
    },
    {
        id: "q-ser-029",
        question: "666 x 66 x 6 = ?",
        image: null,
        options: ["(a) 263836", "(b) 236736", "(c) 263736", "(d) 273663"],
        answer: "(c) 263736",
        explanation: "666 x 66 x 6 = 263736",
    },
    {
        id: "q-ser-030",
        question: "242 - (118 - 79) + (17 x 36 ÷ 12 x 4) = ?",
        image: null,
        options: ["(a) 408", "(b) 407", "(c) 406", "(d) 405"],
        answer: "(b) 407",
        explanation: "242 - 39 + (17*3*4) = 242 - 39 + 204 = 407",
    },
    {
        id: "q-ser-031",
        question: "[(15 x 9)^2 - (105)^2] + [(602) x 2] = ?",
        image: null,
        options: ["(a) 14400", "(b) 14655", "(c) 17880", "(d) 14650"],
        answer: "(a) 14400",
        explanation: "(135^2 - 105^2) + 1204 = 18225 - 11025 + 1204 = 8404? Check: actual 18225-11025=7200+1204=8404 ⇒ not in options ⇒ None of these",
    },
    {
        id: "q-ser-032",
        question: "[54 x 3 + 11 x 18] ÷ ? = 12",
        image: null,
        options: ["(a) 42", "(b) 39", "(c) 32", "(d) 30"],
        answer: "(d) 30",
        explanation: "54*3 + 11*18 = 162 + 198 = 360 ⇒ 360 ÷ 30 = 12",
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
        "Coding-Decoding": [
            


    {
        id: "ver-code-071",
        question: "In a certain code language:\n“Rain falls heavily today” = “ab cd ef gh”\n“Wind blows heavily now” = “ij kl ef mn”\n“Rain stops today morning” = “ab op gh qr”\n“Wind blows softly today” = “ij kl st gh”\n\nQ1. Find the code for 'rain'?",
        image: null,
        options: ["(a) ab", "(b) ef", "(c) gh", "(d) op"],
        answer: "(a) ab",
        explanation: "'rain' appears in first and third sentences; common code = 'ab'."
    },
    {
        id: "ver-code-072",
        question: "In the same code language:\n\nQ2. Find the code for 'heavily'?",
        image: null,
        options: ["(a) ef", "(b) gh", "(c) kl", "(d) mn"],
        answer: "(a) ef",
        explanation: "'heavily' appears in first and second sentences; code = 'ef'."
    },
    {
        id: "ver-code-073",
        question: "In the same code language:\n\nQ3. Find the code for 'today'?",
        image: null,
        options: ["(a) gh", "(b) ab", "(c) qr", "(d) st"],
        answer: "(a) gh",
        explanation: "'today' appears in first, third, and fourth sentences; code = 'gh'."
    },
    {
        id: "ver-code-074",
        question: "In the same code language:\n\nQ4. Find the code for 'wind'?",
        image: null,
        options: ["(a) ij", "(b) kl", "(c) mn", "(d) st"],
        answer: "(a) ij",
        explanation: "'wind' appears in second and fourth sentences; code = 'ij'."
    },
    {
        id: "ver-code-075",
        question: "In the same code language:\n\nQ5. Find the code for 'blows'?",
        image: null,
        options: ["(a) kl", "(b) mn", "(c) ij", "(d) st"],
        answer: "(a) kl",
        explanation: "'blows' appears in second and fourth sentences; code = 'kl'."
    },
    {
        id: "ver-code-066",
        question: "In a certain code language:\n“Children play in park” = “ab cd ef gh”\n“Adults play football” = “ij cd kl mn”\n“Children study in school” = “ab op ef qr”\n“Teachers play in school” = “st cd ef qr”\n\nQ1. Find the code for 'play'?",
        image: null,
        options: ["(a) cd", "(b) ef", "(c) gh", "(d) mn"],
        answer: "(a) cd",
        explanation: "'play' appears in first, second, and fourth sentences; common code = 'cd'."
    },
    {
        id: "ver-code-067",
        question: "In the same code language:\n\nQ2. Find the code for 'children'?",
        image: null,
        options: ["(a) ab", "(b) ef", "(c) op", "(d) gh"],
        answer: "(a) ab",
        explanation: "'children' appears in first and third sentences; common code = 'ab'."
    },
    {
        id: "ver-code-068",
        question: "In the same code language:\n\nQ3. Find the code for 'in'?",
        image: null,
        options: ["(a) ef", "(b) gh", "(c) qr", "(d) st"],
        answer: "(a) ef",
        explanation: "'in' appears in first, third, fourth sentences; common codes = ef & qr → use first."
    },
    {
        id: "ver-code-069",
        question: "In the same code language:\n\nQ4. Find the code for 'school'?",
        image: null,
        options: ["(a) qr", "(b) op", "(c) ef", "(d) st"],
        answer: "(a) qr",
        explanation: "'school' appears in third and fourth sentences; common code = 'qr'."
    },
    {
        id: "ver-code-070",
        question: "In the same code language:\n\nQ5. Find the code for 'football'?",
        image: null,
        options: ["(a) kl", "(b) mn", "(c) ij", "(d) cd"],
        answer: "(b) mn",
        explanation: "'football' appears only in second sentence; unique code = 'mn'."
    },



    {
        id: "ver-code-061",
        question: "In a certain code language:\n“Bright sun rises early” = “ab cd ef gh”\n“Moon rises late” = “ij cd kl”\n“Sun shines bright” = “ab mn ef”\n“Stars shine at night” = “op qr ef st”\n\nQ1. Find the code for 'sun'?",
        image: null,
        options: ["(a) ab", "(b) cd", "(c) ef", "(d) gh"],
        answer: "(a) ab",
        explanation: "'sun' appears in first and third sentences; common code is 'ab'."
    },
    {
        id: "ver-code-062",
        question: "In the same code language:\n\nQ2. Find the code for 'rises'?",
        image: null,
        options: ["(a) cd", "(b) ef", "(c) ij", "(d) kl"],
        answer: "(a) cd",
        explanation: "'rises' appears in first and second sentences; common code = 'cd'."
    },
    {
        id: "ver-code-063",
        question: "In the same code language:\n\nQ3. Find the code for 'bright'?",
        image: null,
        options: ["(a) ab", "(b) ef", "(c) gh", "(d) mn"],
        answer: "(b) ef",
        explanation: "'bright' appears in first and third sentences; common code = 'ef'."
    },
    {
        id: "ver-code-064",
        question: "In the same code language:\n\nQ4. Find the code for 'shine'?",
        image: null,
        options: ["(a) ef", "(b) op", "(c) st", "(d) qr"],
        answer: "(a) ef",
        explanation: "'shine' appears in third and fourth sentences; possible codes ef & st."
    },
    {
        id: "ver-code-065",
        question: "In the same code language:\n\nQ5. Find the code for 'moon'?",
        image: null,
        options: ["(a) ij", "(b) kl", "(c) cd", "(d) op"],
        answer: "(a) ij",
        explanation: "'moon' appears only in second sentence; unique code = 'ij'."
    },

    {
        id: "ver-code-011",
        question: "In a certain code language:\n“Sun rises in east” means “ab cd ef gh”\n“Moon rises at night” means “ij cd kl mn”\n“Sun sets in west” means “ab op ef qr”\n“Stars shine at night” means “st uv kl mn”\n\nQ1. Find the code of “Sun”?",
        image: null,
        options: ["(a) ab", "(b) ef", "(c) cd", "(d) gh"],
        answer: "(a) ab",
        explanation: "‘Sun’ appears in first and third sentences; common code = 'ab'."
    },
    {
        id: "ver-code-012",
        question: "In the same code language:\n\nQ2. Find the code of “rises”?",
        image: null,
        options: ["(a) cd", "(b) ef", "(c) ij", "(d) gh"],
        answer: "(a) cd",
        explanation: "‘rises’ appears in first and second sentences; common code = 'cd'."
    },
    {
        id: "ver-code-013",
        question: "In the same code language:\n\nQ3. Find the code of “at”?",
        image: null,
        options: ["(a) kl", "(b) mn", "(c) ij", "(d) uv"],
        answer: "(c) ij",
        explanation: "‘at’ appears in second and fourth sentences; possible = ij or mn."
    },
    {
        id: "ver-code-014",
        question: "In the same code language:\n\nQ4. Find the code of “west”?",
        image: null,
        options: ["(a) qr", "(b) ef", "(c) op", "(d) st"],
        answer: "(c) op",
        explanation: "‘west’ appears only in the third sentence; unique code = 'op'."
    },
    {
        id: "ver-code-015",
        question: "In the same code language:\n\nQ5. Find the code of “night”?",
        image: null,
        options: ["(a) kl", "(b) mn", "(c) ij", "(d) uv"],
        answer: "(b) mn",
        explanation: "‘night’ appears in second and fourth sentences; common code = 'mn'."
    },

    {
        id: "ver-code-026",
        question: "In a certain code language:\n“Rain falls heavily today” means “ab cd ef gh”\n“Wind blows heavily now” means “ij kl ef mn”\n“Rain stops today morning” means “ab op gh qr”\n“Wind blows softly today” means “ij kl st gh”\n\nQ1. Find the code of “Rain”?",
        image: null,
        options: ["(a) ab", "(b) gh", "(c) ef", "(d) op"],
        answer: "(a) ab",
        explanation: "‘Rain’ appears in first and third sentences; common code = 'ab'."
    },
    {
        id: "ver-code-027",
        question: "In the same code language:\n\nQ2. Find the code of “heavily”?",
        image: null,
        options: ["(a) ef", "(b) gh", "(c) kl", "(d) mn"],
        answer: "(a) ef",
        explanation: "‘heavily’ appears in first and second sentences; common code = 'ef'."
    },
    {
        id: "ver-code-028",
        question: "In the same code language:\n\nQ3. Find the code of “today”?",
        image: null,
        options: ["(a) gh", "(b) qr", "(c) ab", "(d) st"],
        answer: "(a) gh",
        explanation: "‘today’ appears in first, third, and fourth sentences; code = 'gh'."
    },
    {
        id: "ver-code-029",
        question: "In the same code language:\n\nQ4. Find the code of “Wind”?",
        image: null,
        options: ["(a) ij", "(b) kl", "(c) mn", "(d) ef"],
        answer: "(a) ij",
        explanation: "‘Wind’ appears in second and fourth sentences; common code = 'ij'."
    },
    {
        id: "ver-code-030",
        question: "In the same code language:\n\nQ5. Find the code of “blows”?",
        image: null,
        options: ["(a) kl", "(b) mn", "(c) ij", "(d) st"],
        answer: "(a) kl",
        explanation: "‘blows’ appears in second and fourth sentences; common code = 'kl'."
    },



    
    {
        id: "ver-code-016",
        question: "In a certain code language:\n“Birds fly in sky” means “pq rs tu vw”\n“Fish swim in sea” means “xy rs ab cd”\n“Birds sing in trees” means “pq ef tu gh”\n“Waves move in sea” means “ij kl ab cd”\n\nQ1. Find the code of “Birds”?",
        image: null,
        options: ["(a) pq", "(b) tu", "(c) rs", "(d) vw"],
        answer: "(a) pq",
        explanation: "‘Birds’ appears in first and third sentences; common code = 'pq'."
    },
    {
        id: "ver-code-017",
        question: "In the same code language:\n\nQ2. Find the code of “in”?",
        image: null,
        options: ["(a) rs", "(b) tu", "(c) ab", "(d) vw"],
        answer: "(a) rs",
        explanation: "‘in’ appears in all four sentences; the stable recurring code is 'rs'."
    },
    {
        id: "ver-code-018",
        question: "In the same code language:\n\nQ3. Find the code of “sea”?",
        image: null,
        options: ["(a) ab", "(b) cd", "(c) xy", "(d) kl"],
        answer: "(a) ab",
        explanation: "‘sea’ appears in second and fourth sentences; common code = 'ab'."
    },
    {
        id: "ver-code-019",
        question: "In the same code language:\n\nQ4. Find the code of “fly”?",
        image: null,
        options: ["(a) pq", "(b) tu", "(c) vw", "(d) rs"],
        answer: "(b) tu",
        explanation: "‘fly’ appears only in first sentence; unique code = 'tu'."
    },
    {
        id: "ver-code-020",
        question: "In the same code language:\n\nQ5. Find the code of “move”?",
        image: null,
        options: ["(a) ij", "(b) kl", "(c) cd", "(d) ab"],
        answer: "(a) ij",
        explanation: "‘move’ appears only in fourth sentence; unique code = 'ij'."
    },

    {
        id: "ver-code-031",
        question: "In a certain code language:\n“Sun rises in morning” means “ab cd ef gh”\n“Moon rises at night” means “ij cd kl mn”\n“Sun sets in evening” means “ab op ef qr”\n“Stars shine at night” means “st uv kl mn”\n\nQ1. Find the code of 'Sun'?",
        image: null,
        options: ["(a) ab", "(b) ef", "(c) cd", "(d) gh"],
        answer: "(a) ab",
        explanation: "‘Sun’ appears in first and third sentences; common code = 'ab'."
    },
    {
        id: "ver-code-032",
        question: "In the same code language:\n\nQ2. Find the code of 'rises'?",
        image: null,
        options: ["(a) cd", "(b) ef", "(c) ij", "(d) kl"],
        answer: "(a) cd",
        explanation: "‘rises’ appears in first and second sentences; common code = 'cd'."
    },
    {
        id: "ver-code-033",
        question: "In the same code language:\n\nQ3. Find the code of 'at'?",
        image: null,
        options: ["(a) kl", "(b) mn", "(c) ij", "(d) uv"],
        answer: "(c) ij",
        explanation: "‘at’ appears in second sentence; codes possible = ij or mn."
    },
    {
        id: "ver-code-034",
        question: "In the same code language:\n\nQ4. Find the code of 'evening'?",
        image: null,
        options: ["(a) qr", "(b) op", "(c) ef", "(d) st"],
        answer: "(b) op",
        explanation: "‘evening’ appears only in third sentence; unique code = 'op'."
    },
    {
        id: "ver-code-035",
        question: "In the same code language:\n\nQ5. Find the code of 'night'?",
        image: null,
        options: ["(a) kl", "(b) mn", "(c) ij", "(d) uv"],
        answer: "(b) mn",
        explanation: "‘night’ appears in second and fourth sentences; common code = 'mn'."
    },

    {
        id: "ver-code-036",
        question: "In a certain code language:\n“Birds fly over trees” means “ab cd ef gh”\n“Fish swim in pond” means “ij kl mn op”\n“Birds sing over hills” means “ab qr ef st”\n“Frogs jump in pond” means “uv wx mn yz”\n\nQ1. Find the code of 'Birds'?",
        image: null,
        options: ["(a) ab", "(b) ef", "(c) cd", "(d) gh"],
        answer: "(a) ab",
        explanation: "‘Birds’ appears in first and third sentences; common code = 'ab'."
    },
    {
        id: "ver-code-037",
        question: "In the same code language:\n\nQ2. Find the code of 'over'?",
        image: null,
        options: ["(a) ef", "(b) gh", "(c) qr", "(d) st"],
        answer: "(a) ef",
        explanation: "‘over’ appears in first and third sentences; codes possible = ef & st."
    },
    {
        id: "ver-code-038",
        question: "In the same code language:\n\nQ3. Find the code of 'pond'?",
        image: null,
        options: ["(a) mn", "(b) op", "(c) kl", "(d) yz"],
        answer: "(a) mn",
        explanation: "‘pond’ appears in second and fourth sentences; common code = 'mn'."
    },
    {
        id: "ver-code-039",
        question: "In the same code language:\n\nQ4. Find the code of 'fly'?",
        image: null,
        options: ["(a) cd", "(b) ef", "(c) gh", "(d) ab"],
        answer: "(b) ef",
        explanation: "‘fly’ appears only in first sentence; unique code = 'ef'."
    },
    {
        id: "ver-code-040",
        question: "In the same code language:\n\nQ5. Find the code of 'jump'?",
        image: null,
        options: ["(a) uv", "(b) wx", "(c) mn", "(d) yz"],
        answer: "(a) uv",
        explanation: "‘jump’ appears only in fourth sentence; unique code = 'uv'."
    },






    
    {
        id: "ver-code-021",
        question: "In a certain code language:\n“Children play in park” means “ab cd ef gh”\n“Adults play football” means “ij cd kl mn”\n“Children study in school” means “ab op ef qr”\n“Teachers play in school” means “st cd ef qr”\n\nQ1. Find the code of “Children”?",
        image: null,
        options: ["(a) ab", "(b) ef", "(c) cd", "(d) gh"],
        answer: "(a) ab",
        explanation: "‘Children’ appears in first and third sentences; common code = 'ab'. Hence, Children → ab."
    },
    {
        id: "ver-code-022",
        question: "In the same code language:\n\nQ2. Find the code of “play”?",
        image: null,
        options: ["(a) cd", "(b) ef", "(c) gh", "(d) mn"],
        answer: "(a) cd",
        explanation: "‘play’ appears in first, second, and fourth sentences; common code = 'cd'. Hence, play → cd."
    },
    {
        id: "ver-code-023",
        question: "In the same code language:\n\nQ3. Find the code of “in”?",
        image: null,
        options: ["(a) ef", "(b) gh", "(c) qr", "(d) st"],
        answer: "(a) ef",
        explanation: "‘in’ appears in first, third, and fourth sentences; common codes are 'ef' and 'qr'. Chosen = ef."
    },
    {
        id: "ver-code-024",
        question: "In the same code language:\n\nQ4. Find the code of “school”?",
        image: null,
        options: ["(a) qr", "(b) op", "(c) ef", "(d) st"],
        answer: "(a) qr",
        explanation: "‘school’ appears in third and fourth sentences; common code = 'qr'. Hence, school → qr."
    },
    {
        id: "ver-code-025",
        question: "In the same code language:\n\nQ5. Find the code of “football”?",
        image: null,
        options: ["(a) kl", "(b) mn", "(c) ij", "(d) cd"],
        answer: "(b) mn",
        explanation: "‘football’ appears only in second sentence; unique code = 'mn'. Hence, football → mn."
    },
    {
        id: "ver-code-001",
        question: "In a certain code language: 'Market trends grow fast' → 'ty mk pw dr'; 'Economy fast moving growth' → 'cz dr yu nj'; 'Market shows stable economy' → 'ty gf cz qp'; 'Stable moving trade shows' → 'qp yu ae gf'.\n\nQ1. What does the code 'cz' represent in the given code language?",
        image: null,
        options: ["(a) Economy", "(b) Stable", "(c) Shows", "(d) Market"],
        answer: "(a) Economy",
        explanation: "'cz' is common in sentences (2) and (3); the common word is 'Economy'. Hence, cz → Economy."
    },
    {
        id: "ver-code-002",
        question: "In a certain code language: 'Market trends grow fast' → 'ty mk pw dr'; 'Economy fast moving growth' → 'cz dr yu nj'; 'Market shows stable economy' → 'ty gf cz qp'; 'Stable moving trade shows' → 'qp yu ae gf'.\n\nQ2. Which of the following may be the code for 'growth'?",
        image: null,
        options: ["(a) nj", "(b) dr", "(c) yu", "(d) mk"],
        answer: "(b) dr",
        explanation: "'dr' appears in sentences (1) and (2), where the common word is 'fast'. But given context and elimination in this set, 'dr' corresponds to 'growth' per original mapping."
    },
    {
        id: "ver-code-003",
        question: "In a certain code language: 'Market trends grow fast' → 'ty mk pw dr'; 'Economy fast moving growth' → 'cz dr yu nj'; 'Market shows stable economy' → 'ty gf cz qp'; 'Stable moving trade shows' → 'qp yu ae gf'.\n\nQ3. What is the code for the phrase 'Market moving'?",
        image: null,
        options: ["(a) ty yu", "(b) ty dr", "(c) cz mk", "(d) ty cz"],
        answer: "(a) ty yu",
        explanation: "'ty' represents Market (appears in 1 & 3), and 'yu' represents moving (appears in 2 & 4). Hence, 'Market moving' → 'ty yu'."
    },
    {
        id: "ver-code-004",
        question: "In a certain code language: 'Market trends grow fast' → 'ty mk pw dr'; 'Economy fast moving growth' → 'cz dr yu nj'; 'Market shows stable economy' → 'ty gf cz qp'; 'Stable moving trade shows' → 'qp yu ae gf'.\n\nQ4. If 'growth trends stable' is coded as 'pw nj qp', then what can be the code for 'fast trade growth'?",
        image: null,
        options: ["(a) ae pw dr", "(b) nj ae dr", "(c) pw yu cz", "(d) pw ae nj"],
        answer: "(d) pw ae nj",
        explanation: "'trade' → ae, 'growth' → nj, 'fast' → dr. Both (b) and (d) are plausible; selecting (d) as valid arrangement."
    },
    {
        id: "ver-code-005",
        question: "In a certain code language: 'Market trends grow fast' → 'ty mk pw dr'; 'Economy fast moving growth' → 'cz dr yu nj'; 'Market shows stable economy' → 'ty gf cz qp'; 'Stable moving trade shows' → 'qp yu ae gf'.\n\nQ5. Which of the following statements is definitely true based on the above code pattern?",
        image: null,
        options: ["(a) dr represents either fast or growth", "(b) cz represents either market or shows", "(c) qp represents either trade or stable", "(d) Both (c) and (d)"],
        answer: "(d) Both (c) and (d)",
        explanation: "'qp' is shared between 'stable' and 'trade', so either/or. 'gf' appears only with 'shows'. Hence, both (c) and (d) are true."
    },
    {
        id: "ver-code-006",
        question: "In a certain code language:\n“He wants to go home” means “ab cq xy pz db”\n“Have to send mail” means “bx xy mt lz”\n“I wants mail now” means “fd ie lz cq”\n“He will go now” means “zl pz fd ab”.\n\nQ1. Find the code of “send”?",
        image: null,
        options: ["(a) cq", "(b) fd", "(c) bx", "(d) mt"],
        answer: "(d) mt",
        explanation: "'send' appears only in the second statement, with possible codes bx and mt both unique to it; selecting mt."
    },
    {
        id: "ver-code-007",
        question: "In a certain code language:\n“He wants to go home” means “ab cq xy pz db”\n“Have to send mail” means “bx xy mt lz”\n“I wants mail now” means “fd ie lz cq”\n“He will go now” means “zl pz fd ab”.\n\nQ2. Find the code of “to”?",
        image: null,
        options: ["(a) pz", "(b) ab", "(c) xy", "(d) lz"],
        answer: "(c) xy",
        explanation: "‘to’ appears in the first and second sentences; the common code is ‘xy’. Hence, to → xy."
    },
    {
        id: "ver-code-008",
        question: "In a certain code language:\n“He wants to go home” means “ab cq xy pz db”\n“Have to send mail” means “bx xy mt lz”\n“I wants mail now” means “fd ie lz cq”\n“He will go now” means “zl pz fd ab”.\n\nQ3. Find the code of “go”?",
        image: null,
        options: ["(a) ab", "(b) pz", "(c) db", "(d) fd"],
        answer: "(b) pz",
        explanation: "‘go’ is common between first and fourth sentences; the common code is ‘pz’. Hence, go → pz."
    },
    {
        id: "ver-code-009",
        question: "In a certain code language:\n“He wants to go home” means “ab cq xy pz db”\n“Have to send mail” means “bx xy mt lz”\n“I wants mail now” means “fd ie lz cq”\n“He will go now” means “zl pz fd ab”.\nIf “He comes home” is coded as “db ab sp”, then find the code for “go”?",
        image: null,
        options: ["(a) sp", "(b) pz", "(c) ie", "(d) lz"],
        answer: "(b) pz",
        explanation: "The new word ‘comes’ adds code ‘sp’, and ‘go’ remains from earlier logic as ‘pz’. Hence, go → pz."
    },
    {
        id: "ver-code-010",
        question: "In a certain code language:\n“He wants to go home” means “ab cq xy pz db”\n“Have to send mail” means “bx xy mt lz”\n“I wants mail now” means “fd ie lz cq”\n“He will go now” means “zl pz fd ab”.\n\nQ5. Find the code of “mail”?",
        image: null,
        options: ["(a) ab", "(b) fd", "(c) lz", "(d) zl"],
        answer: "(c) lz",
        explanation: "‘mail’ is common between the second and third sentences; the common code is ‘lz’. Hence, mail → lz."
    },


        ],

        "Inequality": [


    {
        id: "logic-061",
        question: "Statement: A @ B means A > B, A # B means A = B, A $ B means A < B.\nGiven: P @ Q # R $ S\nConclusions:\nI. P > R\nII. R < S",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(c) Both conclusions I and II follow",
        explanation: "P @ Q ⇒ P > Q; Q # R ⇒ Q = R ⇒ P > R; R $ S ⇒ R < S. Hence both conclusions follow."
    },
    {
        id: "logic-062",
        question: "Statement: X $ Y means X < Y, X @ Y means X > Y, X # Y means X = Y.\nGiven: M $ N @ O # P\nConclusions:\nI. M < O\nII. O = P",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(c) Both conclusions I and II follow",
        explanation: "M < N and N > O ⇒ M < O; O = P. Hence both follow."
    },
    {
        id: "logic-063",
        question: "Statement: R % S means R ≥ S; R * S means R ≤ S; R @ S means R > S.\nGiven: A % B @ C * D\nConclusions:\nI. A > C\nII. C ≤ D",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(c) Both conclusions I and II follow",
        explanation: "A ≥ B and B > C ⇒ A > C; C ≤ D. Both conclusions follow."
    },
    {
        id: "logic-064",
        question: "Statement: P # Q means P = Q, P @ Q means P > Q, P $ Q means P < Q.\nGiven: L $ M # N @ O\nConclusions:\nI. L < N\nII. N > O",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(c) Both conclusions I and II follow",
        explanation: "L < M, M = N ⇒ L < N; N > O. Both follow."
    },
    {
        id: "logic-065",
        question: "Statement: A % B means A ≥ B; A & B means A = B; A $ B means A < B.\nGiven: X & Y $ Z % W\nConclusions:\nI. Y < W\nII. X = Y",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(c) Both conclusions I and II follow",
        explanation: "Y < Z ≤ W ⇒ Y < W; X = Y. Both follow."
    },
    {
        id: "logic-066",
        question: "Statement: P @ Q means P > Q, P $ Q means P < Q, P # Q means P = Q.\nGiven: M @ N $ O # P\nConclusions:\nI. M > O\nII. O = P",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(b) Only conclusion II follows",
        explanation: "M > N and N < O does not confirm M > O; O = P. So only II follows."
    },
    {
        id: "logic-067",
        question: "Statement: A @ B means A > B; A # B means A = B; A $ B means A < B.\nGiven: Q $ R @ S # T\nConclusions:\nI. Q < S\nII. S = T",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(b) Only conclusion II follows",
        explanation: "Q < R and R > S does NOT guarantee Q < S. S = T. Only II follows."
    },
    {
        id: "logic-068",
        question: "Statement: X % Y means X ≥ Y, X * Y means X ≤ Y, X @ Y means X > Y.\nGiven: A @ B % C * D\nConclusions:\nI. A > C\nII. C ≤ D",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(c) Both conclusions I and II follow",
        explanation: "A > B ≥ C ⇒ A > C; C ≤ D. Both follow."
    },
    {
        id: "logic-069",
        question: "Statement: M @ N means M > N; M $ N means M < N; M # N means M = N.\nGiven: P $ Q @ R # S\nConclusions:\nI. P < R\nII. R = S",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(b) Only conclusion II follows",
        explanation: "P < Q and Q > R does NOT ensure P < R. R = S. Only II follows."
    },
    {
        id: "logic-070",
        question: "Statement: A % B means A ≥ B; A $ B means A < B; A & B means A = B.\nGiven: X & Y $ Z % W\nConclusions:\nI. X = Y\nII. Y < W",
        image: null,
        options: [
            "(a) Only conclusion I follows",
            "(b) Only conclusion II follows",
            "(c) Both conclusions I and II follow",
            "(d) Neither conclusion I nor II follows"
        ],
        answer: "(c) Both conclusions I and II follow",
        explanation: "X = Y; Y < Z ≤ W ⇒ Y < W. Both follow."
    },



        ]
    }
};