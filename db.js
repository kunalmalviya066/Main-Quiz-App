/* ============================================================
   db.js — LocalStorage Database (ES Module)
   ============================================================ */

import {
    safeGet, safeSet,
    randomId, sha256
} from "./utils.js";

const DB_KEY = "quizmaster_db_v1";

/* ============================================================
   DEFAULT DATABASE STRUCTURE
   ============================================================ */
const defaultDB = {
    dbVersion: 1,

    admins: [
        {
            id: "admin_1",
            username: "admin",
            passwordHash: "",
            createdAt: new Date().toISOString()
        }
    ],

    subjects: [],
    topics: [],
    questions: [],
    testsHistory: [],

    dailyQuiz: {
        lastDate: null,
        testId: null
    }
};

/* ============================================================
   INITIALIZATION
   ============================================================ */
let db = safeGet(DB_KEY);

if (!db) {
    db = structuredClone(defaultDB);

    // Set default admin password (async)
    (async () => {
        db.admins[0].passwordHash = await sha256("admin123");
        safeSet(DB_KEY, db);
    })();
}

function saveDB() {
    safeSet(DB_KEY, db);
}

/* ============================================================
   ADMIN AUTH
   ============================================================ */
export async function validateAdmin(username, password) {
    const hash = await sha256(password);
    return db.admins.find(
        a => a.username === username && a.passwordHash === hash
    ) || null;
}

/* ============================================================
   SUBJECTS CRUD
   ============================================================ */
export function getSubjects() {
    return [...db.subjects];
}

export function addSubject(name, description = "") {
    const obj = {
        id: randomId("sub"),
        name,
        description,
        createdAt: new Date().toISOString()
    };
    db.subjects.push(obj);
    saveDB();
    return obj;
}

export function updateSubject(id, fields) {
    const s = db.subjects.find(x => x.id === id);
    if (!s) return false;
    Object.assign(s, fields);
    saveDB();
    return true;
}

export function deleteSubject(id) {
    db.subjects = db.subjects.filter(s => s.id !== id);

    const topicIds = db.topics
        .filter(t => t.subjectId === id)
        .map(t => t.id);

    db.topics = db.topics.filter(t => t.subjectId !== id);
    db.questions = db.questions.filter(q => !topicIds.includes(q.topicId));

    saveDB();
}

/* ============================================================
   TOPICS CRUD
   ============================================================ */
export function getTopics(subjectId = null) {
    return subjectId
        ? db.topics.filter(t => t.subjectId === subjectId)
        : [...db.topics];
}

export function addTopic(subjectId, name, description = "") {
    const t = {
        id: randomId("topic"),
        subjectId,
        name,
        description,
        createdAt: new Date().toISOString()
    };
    db.topics.push(t);
    saveDB();
    return t;
}

export function updateTopic(id, fields) {
    const t = db.topics.find(x => x.id === id);
    if (!t) return false;
    Object.assign(t, fields);
    saveDB();
    return true;
}

export function deleteTopic(id) {
    db.topics = db.topics.filter(t => t.id !== id);
    db.questions = db.questions.filter(q => q.topicId !== id);
    saveDB();
}

/* ============================================================
   QUESTIONS CRUD
   ============================================================ */
export function getQuestions(filter = {}) {
    return db.questions.filter(q => {
        if (filter.subjectId && q.subjectId !== filter.subjectId) return false;
        if (filter.topicId && q.topicId !== filter.topicId) return false;
        return true;
    });
}

export function addQuestion(
    subjectId,
    topicId,
    questionText,
    choices,
    correctChoice,
    imageBase64 = "",
    difficulty = ""
) {
    const q = {
        id: randomId("q"),
        subjectId,
        topicId,
        questionText,
        choices,
        correctChoice,
        imageBase64,
        difficulty,
        createdAt: new Date().toISOString()
    };

    db.questions.push(q);
    saveDB();
    return q;
}

export function updateQuestion(id, fields) {
    const q = db.questions.find(x => x.id === id);
    if (!q) return false;
    Object.assign(q, fields);
    saveDB();
    return true;
}

export function deleteQuestion(id) {
    db.questions = db.questions.filter(q => q.id !== id);
    saveDB();
}

/* ============================================================
   TEST HISTORY
   ============================================================ */
export function addTestHistory(history) {
    history.id = randomId("test");
    history.createdAt = new Date().toISOString();
    db.testsHistory.push(history);
    saveDB();
}

export function getTestHistory() {
    return [...db.testsHistory];
}

/* ============================================================
   DAILY QUIZ
   ============================================================ */
export function setDailyQuiz(date, testId) {
    db.dailyQuiz.lastDate = date;
    db.dailyQuiz.testId = testId;
    saveDB();
}

export function getDailyQuiz() {
    return db.dailyQuiz;
}

/* ============================================================
   EXPORT / IMPORT FULL DB
   ============================================================ */
export function exportJSON() {
    return JSON.stringify(db, null, 2);
}

export function importJSON(jsonString) {
    try {
        const newDB = JSON.parse(jsonString);
        db = newDB;
        saveDB();
        return true;
    } catch {
        return false;
    }
}

/* ============================================================
   CSV IMPORT (FULLY FIXED)
   ============================================================ */

const normalize = s => (s || "").trim().toLowerCase();

// Maps CSV headers → internal fields
const HEADER_MAP = {
    "subject": "subject",
    "topic": "topic",
    "prompt": "prompt",
    "question": "prompt",
    "questiontext": "prompt",

    "choicea": "choiceA",
    "choiceb": "choiceB",
    "choicec": "choiceC",
    "choiced": "choiceD",

    "correct": "correctIndex",
    "answer": "correctIndex",
    "correctindex": "correctIndex",

    "image": "image",
    "img": "image",

    "difficulty": "difficulty",
    "level": "difficulty"
};

/**
 * Convert CSV row to platform question object safely.
 */
function normalizeCSVRow(row) {
    const result = {
        subject: "",
        topic: "",
        prompt: "",
        choiceA: "",
        choiceB: "",
        choiceC: "",
        choiceD: "",
        correctIndex: "",
        image: "",
        difficulty: ""
    };

    for (const key in row) {
        const cleanKey = normalize(key).replace(/[^a-z]/g, "");
        const mapped = HEADER_MAP[cleanKey];
        if (mapped && row[key] != null) {
            result[mapped] = row[key];
        }
    }

    return result;
}

/**
 * Import CSV rows into DB:
 * - Automatically creates subject/topic if missing
 * - Missing columns allowed
 * - Base64/URL images supported
 */
export function importQuestionsBulk(csvRows = []) {
    const added = [];

    for (let raw of csvRows) {
        const row = normalizeCSVRow(raw);

        if (!row.subject || !row.prompt) continue;

        // ---------- SUBJECT ----------
        let sub = db.subjects.find(s => normalize(s.name) === normalize(row.subject));
        if (!sub) {
            sub = addSubject(row.subject, "");
        }

        // ---------- TOPIC ----------
        let top = db.topics.find(t =>
            t.subjectId === sub.id && normalize(t.name) === normalize(row.topic)
        );
        if (!top) {
            top = addTopic(sub.id, row.topic || "General", "");
        }

        // ---------- CHOICES ----------
        const choices = {
            A: row.choiceA || "",
            B: row.choiceB || "",
            C: row.choiceC || "",
            D: row.choiceD || ""
        };

        // ---------- CORRECT ANSWER ----------
        const correct = (row.correctIndex || "").toString().trim().toUpperCase();
        const validCorrect = ["A", "B", "C", "D"].includes(correct) ? correct : "A";

        // ---------- ADD QUESTION ----------
        const q = addQuestion(
            sub.id,
            top.id,
            row.prompt,
            choices,
            validCorrect,
            row.image || "",
            row.difficulty || ""
        );

        added.push(q);
    }

    return added;
}

/* ============================================================
   CSV EXPORT
   ============================================================ */
export function exportQuestionsCSV() {
    return db.questions.map(q => ({
        subject: db.subjects.find(s => s.id === q.subjectId)?.name || "",
        topic: db.topics.find(t => t.id === q.topicId)?.name || "",
        prompt: q.questionText,

        choiceA: q.choices.A,
        choiceB: q.choices.B,
        choiceC: q.choices.C,
        choiceD: q.choices.D,

        correctIndex: q.correctChoice,
        image: q.imageBase64,
        difficulty: q.difficulty
    }));
}
