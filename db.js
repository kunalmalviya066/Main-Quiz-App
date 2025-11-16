// db.js
// Complete LocalStorage Database Layer
export const DB_KEYS = {
    SUBJECTS: 'quiz_subjects',
    TOPICS: 'quiz_topics',
    QUESTIONS: 'quiz_questions',
    HISTORY: 'quiz_history',
};

const INITIAL_DATA = {
    [DB_KEYS.SUBJECTS]: [
        { id: 'sub-1', name: 'Mathematics' },
        { id: 'sub-2', name: 'Science' },
    ],
    [DB_KEYS.TOPICS]: [
        { id: 'top-1', subjectId: 'sub-1', name: 'Algebra' },
        { id: 'top-2', subjectId: 'sub-1', name: 'Calculus' },
        { id: 'top-3', subjectId: 'sub-2', name: 'Physics' },
    ],
    [DB_KEYS.QUESTIONS]: [
        { id: 'q-1', topicId: 'top-1', question: 'What is $2x + 5 = 9$?', choices: ['x=2', 'x=4', 'x=7'], answer: 'x=2', explanation: 'Subtract 5, then divide by 2.', imgUrl: '' },
        { id: 'q-2', topicId: 'top-3', question: 'What is the SI unit of force?', choices: ['Joule', 'Newton', 'Watt'], answer: 'Newton', explanation: 'The unit of force is the Newton (N).', imgUrl: '' },
        { id: 'q-3', topicId: 'top-1', question: 'Solve $x^2 - 4 = 0$.', choices: ['2', '-2', '±2'], answer: '±2', explanation: 'The square root of 4 is both 2 and -2.', imgUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIzMCIgZmlsbD0iI2Y5ZTRhYiIgc3Ryb2tlPSIjYmQ5ZTAwIiBzdHJva2Utd2lkdGg9IjMiLz48dGV4dCB4PSI1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJTYW5zLXNlcmlmIiBmb250LXNpemU9IjIwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMDAwIj5NYXRoPC90ZXh0Pjwvc3ZnPg==' }
    ],
    [DB_KEYS.HISTORY]: [],
};

// Initialize DB with dummy data if empty
function initializeDB() {
    Object.keys(INITIAL_DATA).forEach(key => {
        if (!localStorage.getItem(key)) {
            localStorage.setItem(key, JSON.stringify(INITIAL_DATA[key]));
        }
    });
}
initializeDB();

// --- CRUD Operations ---
function getAll(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveAll(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

export const db = {
    // Read
    getSubjects: () => getAll(DB_KEYS.SUBJECTS),
    getTopics: () => getAll(DB_KEYS.TOPICS),
    getQuestions: () => getAll(DB_KEYS.QUESTIONS),
    getHistory: () => getAll(DB_KEYS.HISTORY),

    // Create/Update (Generic)
    save: (key, record) => {
        const records = getAll(key);
        let updated = false;

        if (record.id) {
            // Update
            const index = records.findIndex(r => r.id === record.id);
            if (index !== -1) {
                records[index] = { ...records[index], ...record };
                updated = true;
            }
        }

        if (!updated) {
            // Create
            record.id = key.substring(5, 8) + '-' + Date.now();
            records.push(record);
        }

        saveAll(key, records);
        return record;
    },

    // Delete
    delete: (key, id) => {
        const records = getAll(key);
        const filtered = records.filter(r => r.id !== id);
        saveAll(key, filtered);
    },

    // History Specific
    addHistory: (testResult) => {
        const history = getAll(DB_KEYS.HISTORY);
        testResult.timestamp = new Date().toISOString();
        history.push(testResult);
        saveAll(DB_KEYS.HISTORY, history);
    },
    
    // Admin Utility
    getFullDB: () => {
        return {
            subjects: db.getSubjects(),
            topics: db.getTopics(),
            questions: db.getQuestions(),
            history: db.getHistory()
        };
    }
};