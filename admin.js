import {
    $, $all, createEl, fileToBase64,
    parseCSV, generateCSV, downloadFile
} from "./utils.js";

import {
    validateAdmin,
    getSubjects, addSubject, updateSubject, deleteSubject,
    getTopics, addTopic, updateTopic, deleteTopic,
    getQuestions, addQuestion, updateQuestion, deleteQuestion,
    getTestHistory, importQuestionsBulk,
    exportQuestionsCSV, exportJSON
} from "./db.js";

/* ------------------- LOGIN ------------------- */
$("#adminLoginBtn").addEventListener("click", async () => {
    const u = $("#adminUsername").value.trim();
    const p = $("#adminPassword").value.trim();

    const admin = await validateAdmin(u, p);

    if (!admin) {
        $("#adminLoginError").textContent = "Invalid credentials";
        return;
    }

    $("#adminLoginPage").classList.add("hidden");
    $("#adminDashboard").classList.remove("hidden");
});

$("#adminLogoutBtn").addEventListener("click", () => {
    location.reload();
});

/* ------------------- NAVIGATION ------------------- */
$all(".sidebar-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const sec = btn.getAttribute("data-admin-section");
        if (!sec) return;

        $all(".admin-section").forEach(s => s.classList.add("hidden"));
        $("#admin" + sec.charAt(0).toUpperCase() + sec.slice(1)).classList.remove("hidden");

        if (sec === "subjects") renderSubjects();
        if (sec === "topics") loadTopicsPage();
        if (sec === "questions") loadQuestionsPage();
        if (sec === "history") renderHistory();
    });
});

/* ------------------- SUBJECTS ------------------- */
function renderSubjects() {
    const list = getSubjects();
    const box = $("#subjectsTableContainer");

    if (!list.length) {
        box.innerHTML = "<p>No subjects added.</p>";
        return;
    }

    let html = `<table><tr>
        <th>Name</th><th>Description</th><th>Actions</th>
    </tr>`;

    list.forEach(s => {
        html += `<tr>
            <td>${s.name}</td>
            <td>${s.description}</td>
            <td>
                <button class="btn-secondary editSub" data-id="${s.id}">Edit</button>
                <button class="btn-primary deleteSub" data-id="${s.id}">Delete</button>
            </td>
        </tr>`;
    });

    html += "</table>";
    box.innerHTML = html;

    $all(".editSub").forEach(b => {
        b.addEventListener("click", () => {
            const id = b.dataset.id;
            const s = getSubjects().find(x => x.id === id);
            const n = prompt("New name:", s.name);
            const d = prompt("New desc:", s.description);
            if (n) updateSubject(id, { name: n, description: d });
            renderSubjects();
        });
    });

    $all(".deleteSub").forEach(b => {
        b.addEventListener("click", () => {
            if (!confirm("Delete subject?")) return;
            deleteSubject(b.dataset.id);
            renderSubjects();
        });
    });
}

$("#addSubjectBtn").addEventListener("click", () => {
    const n = $("#subjectName").value.trim();
    const d = $("#subjectDesc").value.trim();
    if (!n) return;
    addSubject(n, d);
    $("#subjectName").value = "";
    $("#subjectDesc").value = "";
    renderSubjects();
});

/* ------------------- TOPICS ------------------- */
function loadTopicsPage() {
    const sel = $("#topicSubjectSelect");
    sel.innerHTML = `<option value="">Select Subject</option>`;
    getSubjects().forEach(s => {
        sel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });
    renderTopics();
}

function renderTopics() {
    const list = getTopics();
    const box = $("#topicsTableContainer");

    if (!list.length) {
        box.innerHTML = "<p>No topics.</p>";
        return;
    }

    let html = `<table><tr>
        <th>Subject</th><th>Topic</th><th>Description</th><th>Actions</th>
    </tr>`;

    list.forEach(t => {
        const s = getSubjects().find(x => x.id === t.subjectId);
        html += `<tr>
            <td>${s?.name ?? ""}</td>
            <td>${t.name}</td>
            <td>${t.description}</td>
            <td>
                <button class="btn-secondary editTopic" data-id="${t.id}">Edit</button>
                <button class="btn-primary deleteTopic" data-id="${t.id}">Delete</button>
            </td>
        </tr>`;
    });

    html += "</table>";
    box.innerHTML = html;

    $all(".editTopic").forEach(b => {
        b.addEventListener("click", () => {
            const id = b.dataset.id;
            const t = getTopics().find(x => x.id === id);
            const n = prompt("New name:", t.name);
            const d = prompt("New description:", t.description);
            if (n) updateTopic(id, { name: n, description: d });
            renderTopics();
        });
    });

    $all(".deleteTopic").forEach(b => {
        b.addEventListener("click", () => {
            if (!confirm("Delete topic?")) return;
            deleteTopic(b.dataset.id);
            renderTopics();
        });
    });
}

$("#addTopicBtn").addEventListener("click", () => {
    const sid = $("#topicSubjectSelect").value;
    const n = $("#topicName").value.trim();
    const d = $("#topicDesc").value.trim();
    if (!sid || !n) return;

    addTopic(sid, n, d);
    $("#topicName").value = "";
    $("#topicDesc").value = "";
    renderTopics();
});

/* ------------------- QUESTIONS ------------------- */
function loadQuestionsPage() {
    const subjectSel = $("#questionSubjectSelect");
    subjectSel.innerHTML = `<option value="">Select Subject</option>`;
    getSubjects().forEach(s => {
        subjectSel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    subjectSel.addEventListener("change", () => {
        const tidSel = $("#questionTopicSelect");
        tidSel.innerHTML = `<option value="">Select Topic</option>`;
        getTopics(subjectSel.value).forEach(t => {
            tidSel.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
    });

    renderQuestions();
}

function renderQuestions() {
    const list = getQuestions();
    const box = $("#questionsTableContainer");

    if (!list.length) {
        box.innerHTML = "<p>No questions.</p>";
        return;
    }

    let html = `<table><tr>
        <th>Subject</th><th>Topic</th><th>Prompt</th><th>Correct</th><th>Actions</th>
    </tr>`;

    list.forEach(q => {
        const s = getSubjects().find(x => x.id === q.subjectId);
        const t = getTopics().find(x => x.id === q.topicId);

        html += `<tr>
            <td>${s?.name ?? ""}</td>
            <td>${t?.name ?? ""}</td>
            <td>${q.questionText.slice(0,50)}...</td>
            <td>${q.correctChoice}</td>
            <td>
                <button class="btn-primary deleteQ" data-id="${q.id}">Delete</button>
            </td>
        </tr>`;
    });

    html += "</table>";
    box.innerHTML = html;

    $all(".deleteQ").forEach(b => {
        b.addEventListener("click", () => {
            if (!confirm("Delete question?")) return;
            deleteQuestion(b.dataset.id);
            renderQuestions();
        });
    });
}

$("#questionImage").addEventListener("change", async function(){
    const f=this.files[0];
    if(!f) return;
    $("#imagePreview").value = await fileToBase64(f);
});

$("#addQuestionBtn").addEventListener("click", () => {
    const sid = $("#questionSubjectSelect").value;
    const tid = $("#questionTopicSelect").value;
    const txt = $("#questionText").value.trim();
    const A = $("#choiceA").value.trim();
    const B = $("#choiceB").value.trim();
    const C = $("#choiceC").value.trim();
    const D = $("#choiceD").value.trim();
    const correct = $("#correctChoiceSelect").value;
    const img = $("#imagePreview").value.trim();
    const diff = $("#difficultySelect").value;

    if (!sid || !tid || !txt || !correct) return;

    addQuestion(sid, tid, txt, {A,B,C,D}, correct, img, diff);

    $("#questionText").value = "";
    $("#choiceA").value = "";
    $("#choiceB").value = "";
    $("#choiceC").value = "";
    $("#choiceD").value = "";
    $("#correctChoiceSelect").value = "";
    $("#imagePreview").value = "";
    $("#difficultySelect").value = "";

    renderQuestions();
});

/* ------------------- CSV ------------------- */
$("#csvImportBtn").addEventListener("click", async () => {
    const file = $("#csvImportInput").files[0];
    if (!file) return alert("No file selected.");

    const text = await file.text();
    const parsed = parseCSV(text);
    importQuestionsBulk(parsed.rows);

    alert("CSV imported!");
    renderQuestions();
});

$("#csvExportBtn").addEventListener("click", () => {
    const rows = exportQuestionsCSV();
    const headers = ["subject","topic","prompt","choiceA","choiceB","choiceC","choiceD","correctIndex","image","difficulty"];
    const csv = generateCSV(headers, rows);
    downloadFile("questions.csv", csv);
});

$("#jsonExportBtn").addEventListener("click", () => {
    const s = exportJSON();
    downloadFile("quizmaster_db.json", s);
});

/* ------------------- HISTORY ------------------- */
function renderHistory() {
    const list = getTestHistory();
    const box = $("#testHistoryContainer");

    if (!list.length) {
        box.innerHTML = "<p>No test history.</p>";
        return;
    }

    let html = `<table><tr>
        <th>Date</th><th>Subject</th><th>Score</th><th>Total</th><th>Time</th>
    </tr>`;

    list.forEach(h => {
        html += `<tr>
            <td>${new Date(h.createdAt).toLocaleString()}</td>
            <td>${h.subjectName ?? ""}</td>
            <td>${h.score}</td>
            <td>${h.totalQuestions}</td>
            <td>${h.timeTaken}s</td>
        </tr>`;
    });

    html += "</table>";
    box.innerHTML = html;
}
