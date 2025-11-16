// admin.js
import { db, DB_KEYS } from './db.js';

// --- DOM Elements ---
const loginSection = document.getElementById('admin-login');
const dashboardSection = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const dbExportBtn = document.getElementById('db-export-btn');
const subjectListDiv = document.getElementById('subject-list');
const topicListDiv = document.getElementById('topic-list');
const questionListDiv = document.getElementById('question-list');
const historyListDiv = document.getElementById('history-list');
const subjectSelects = [document.getElementById('topic-subject-select')];
const topicSelect = document.getElementById('question-topic-select');

// --- State and Constants ---
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};
const IS_LOGGED_IN_KEY = 'admin_logged_in';

// --- Utility: Login/Logout ---
function checkLogin() {
    const isLoggedIn = localStorage.getItem(IS_LOGGED_IN_KEY) === 'true';
    if (isLoggedIn) {
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    loginSection.style.display = 'block';
    dashboardSection.style.display = 'none';
}

function showDashboard() {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    renderAllCRUDLists();
}

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    const msgEl = document.getElementById('login-message');

    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
        localStorage.setItem(IS_LOGGED_IN_KEY, 'true');
        msgEl.textContent = 'Login successful!';
        showDashboard();
    } else {
        msgEl.textContent = 'Invalid credentials.';
    }
}

function handleLogout() {
    localStorage.removeItem(IS_LOGGED_IN_KEY);
    showLogin();
}

// --- CRUD Rendering Functions ---

function renderSubjects() {
    const subjects = db.getSubjects();
    let html = '<ul>';
    let selectOptions = '<option value="">-- Select Subject --</option>';

    subjects.forEach(sub => {
        html += `
            <li>
                <span>${sub.name} (ID: ${sub.id})</span>
                <div>
                    <button class="btn btn-secondary btn-sm" onclick="editSubject('${sub.id}', '${sub.name}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('${DB_KEYS.SUBJECTS}', '${sub.id}')">Delete</button>
                </div>
            </li>
        `;
        selectOptions += `<option value="${sub.id}">${sub.name}</option>`;
    });
    html += '</ul>';
    subjectListDiv.innerHTML = html;

    // Update all subject select fields
    subjectSelects.forEach(select => select.innerHTML = selectOptions);
    
    renderTopics(); // Re-render topics as they depend on subjects
}

function renderTopics() {
    const topics = db.getTopics();
    const subjects = db.getSubjects().reduce((map, sub) => (map[sub.id] = sub.name, map), {});
    let html = '<ul>';
    let topicSelectOptions = '<option value="">-- Select Topic --</option>';

    topics.forEach(topic => {
        const subjectName = subjects[topic.subjectId] || 'Unknown Subject';
        html += `
            <li>
                <span>${topic.name} (${subjectName})</span>
                <div>
                    <button class="btn btn-secondary btn-sm" onclick="editTopic('${topic.id}', '${topic.subjectId}', '${topic.name}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('${DB_KEYS.TOPICS}', '${topic.id}')">Delete</button>
                </div>
            </li>
        `;
        topicSelectOptions += `<option value="${topic.id}">${topic.name}</option>`;
    });
    html += '</ul>';
    topicListDiv.innerHTML = html;
    
    topicSelect.innerHTML = topicSelectOptions; // Update question topic select
    renderQuestions(); // Re-render questions
}

function renderQuestions() {
    const questions = db.getQuestions();
    const topics = db.getTopics().reduce((map, top) => (map[top.id] = top.name, map), {});
    let html = '<ul>';

    questions.forEach(q => {
        const topicName = topics[q.topicId] || 'Unknown Topic';
        html += `
            <li>
                <span>${topicName}: ${q.question.substring(0, 50)}...</span>
                <div>
                    <button class="btn btn-secondary btn-sm" onclick="editQuestion('${q.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('${DB_KEYS.QUESTIONS}', '${q.id}')">Delete</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    questionListDiv.innerHTML = html;
    
    renderHistoryList();
}

function renderHistoryList() {
    const history = db.getHistory().reverse(); // Show most recent first
    let html = '<ul>';

    history.forEach(h => {
        const date = new Date(h.timestamp).toLocaleString();
        html += `
            <li>
                <span>${date} | ${h.title} (Score: ${h.correct}/${h.totalMarks}, Time: ${h.totalTime})</span>
                <div>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('${DB_KEYS.HISTORY}', '${h.timestamp}')">Delete</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    historyListDiv.innerHTML = html;
}

function renderAllCRUDLists() {
    renderSubjects();
}

// --- CRUD Helper Functions (Attached to window for inline HTML calls) ---

window.deleteRecord = (key, id) => {
    if (confirm('Are you sure you want to delete this record?')) {
        db.delete(key, id);
        renderAllCRUDLists();
    }
};

window.editSubject = (id, name) => {
    document.getElementById('subject-id').value = id;
    document.getElementById('subject-name').value = name;
};

window.editTopic = (id, subjectId, name) => {
    document.getElementById('topic-id').value = id;
    document.getElementById('topic-subject-select').value = subjectId;
    document.getElementById('topic-name').value = name;
};

window.editQuestion = (id) => {
    const question = db.getQuestions().find(q => q.id === id);
    if (!question) return;

    document.getElementById('question-id').value = id;
    document.getElementById('question-topic-select').value = question.topicId;
    document.getElementById('question-text-input').value = question.question;
    document.getElementById('question-choices').value = question.choices.join(', ');
    document.getElementById('question-answer').value = question.answer;
    document.getElementById('question-explanation').value = question.explanation || '';
    document.getElementById('question-img-url').value = question.imgUrl || '';
};

// --- CRUD Form Submission Handlers ---

document.getElementById('subject-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('subject-id').value;
    const name = document.getElementById('subject-name').value;
    
    db.save(DB_KEYS.SUBJECTS, { id, name });
    e.target.reset(); // Clear form
    renderSubjects();
});

document.getElementById('topic-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('topic-id').value;
    const subjectId = document.getElementById('topic-subject-select').value;
    const name = document.getElementById('topic-name').value;
    
    db.save(DB_KEYS.TOPICS, { id, subjectId, name });
    e.target.reset();
    renderTopics();
});

document.getElementById('question-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('question-id').value;
    const topicId = document.getElementById('question-topic-select').value;
    const question = document.getElementById('question-text-input').value;
    const choices = document.getElementById('question-choices').value.split(',').map(c => c.trim()).filter(c => c);
    const answer = document.getElementById('question-answer').value.trim();
    const explanation = document.getElementById('question-explanation').value.trim();
    const imgUrl = document.getElementById('question-img-url').value.trim();
    
    if (!choices.includes(answer)) {
        alert("The correct answer must match one of the choices!");
        return;
    }

    db.save(DB_KEYS.QUESTIONS, { 
        id, topicId, question, choices, answer, explanation, imgUrl 
    });
    e.target.reset();
    renderQuestions();
});

// --- DB Export Functionality ---

dbExportBtn.addEventListener('click', () => {
    const dbData = db.getFullDB();
    const dataStr = JSON.stringify(dbData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = 'quiz_db_export.json';

    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    alert('Database successfully exported as quiz_db_export.json');
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    checkLogin();
});

// Sync localStorage changes after any admin action
// This ensures that rendering is always up-to-date.
window.addEventListener('storage', (e) => {
    if (e.key && Object.values(DB_KEYS).includes(e.key) && dashboardSection.style.display !== 'none') {
        renderAllCRUDLists();
    }
});