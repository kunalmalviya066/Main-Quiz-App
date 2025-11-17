/* admin.js
   Handles admin login, dashboard UI, CRUD operations,
   CSV/JSON import/export, password change, and DB maintenance.
*/

(async function () {
  'use strict';

  await DB.init();
  const root = document.getElementById('adminRoot');
  const loginCard = document.getElementById('loginCard');
  const dash = document.getElementById('dashboard');

  // Elements
  const admUser = document.getElementById('admUser');
  const admPass = document.getElementById('admPass');
  const admMsg = document.getElementById('admMsg');
  const admLogin = document.getElementById('admLogin');
  const admResetSeed = document.getElementById('admResetSeed');

  // Tables and inputs
  const subjectsTable = document.getElementById('subjectsTable');
  const topicsTable = document.getElementById('topicsTable');
  const questionsTable = document.getElementById('questionsTable');
  const topicSubjectSelect = document.getElementById('topicSubjectSelect');
  const qSubjectSelect = document.getElementById('qSubjectSelect');
  const qTopicSelect = document.getElementById('qTopicSelect');

  const addSubjectBtn = document.getElementById('addSubjectBtn');
  const newSubjectName = document.getElementById('newSubjectName');

  const addTopicBtn = document.getElementById('addTopicBtn');
  const newTopicName = document.getElementById('newTopicName');

  const newQBtn = document.getElementById('newQBtn');
  const importCsvBtn = document.getElementById('importCsvBtn');
  const csvUpload = document.getElementById('csvUpload');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  const changePwdBtn = document.getElementById('changePwdBtn');
  const currPwd = document.getElementById('currPwd');
  const newPwd = document.getElementById('newPwd');
  const pwdMsg = document.getElementById('pwdMsg');

  const exportDbBtn = document.getElementById('exportDbBtn');
  const clearDbBtn = document.getElementById('clearDbBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  // ---------------- LOGIN ----------------
  admLogin.onclick = async () => {
    admMsg.textContent = '';

    if (DB.isLockedOut()) {
      admMsg.textContent = 'Locked for 10 minutes due to failed attempts.';
      return;
    }

    const user = admUser.value.trim();
    const pass = admPass.value.trim();
    const settings = DB.getSettings();

    if (user !== settings.adminUsername) {
      DB.registerFailedLoginAttempt();
      admMsg.textContent = 'Invalid username';
      return;
    }

    const ok = await DB.verifyAdminPassword(pass);
    if (!ok) {
      DB.registerFailedLoginAttempt();
      admMsg.textContent = 'Invalid password';
      return;
    }

    DB.resetLockout();
    loginCard.style.display = 'none';
    dash.style.display = 'block';
    loadDashboard();
  };

  // Reset DB to seed
  admResetSeed.onclick = async () => {
    if (confirm('Reset database to seed? This will erase all changes.')) {
      await DB.resetDBToSeed();
      alert('DB reset. Reloading.');
      location.reload();
    }
  };

  // ---------------- DASHBOARD LOAD ----------------
  function loadDashboard() {
    loadSubjects();
    loadTopics();
    loadQuestionsSelectors();
    loadQuestions();
  }

  // ---------------- SUBJECT CRUD ----------------
  function loadSubjects() {
    const subs = DB.listSubjects();
    subjectsTable.innerHTML = `
      <tr><th>Name</th><th>Actions</th></tr>
      ${subs.map(s => `
        <tr>
          <td><input data-sid="${s.id}" class="editSub" value="${s.name}"></td>
          <td class="table-actions">
            <button class="btn btn-light delSub" data-sid="${s.id}">Delete</button>
          </td>
        </tr>
      `).join('')}
    `;

    document.querySelectorAll('.editSub').forEach(inp => {
      inp.onchange = () => DB.updateSubject(inp.dataset.sid, inp.value.trim());
    });

    document.querySelectorAll('.delSub').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Delete subject?')) {
          DB.deleteSubject(btn.dataset.sid);
          loadDashboard();
        }
      }
    });
  }

  addSubjectBtn.onclick = () => {
    const name = newSubjectName.value.trim();
    if (!name) return;
    DB.addSubject(name);
    newSubjectName.value = '';
    loadDashboard();
  };

  // ---------------- TOPIC CRUD ----------------
  function loadTopics() {
    const subs = DB.listSubjects();
    const topics = DB.listTopics();

    topicSubjectSelect.innerHTML = subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    topicsTable.innerHTML = `
      <tr><th>Topic</th><th>Subject</th><th>Actions</th></tr>
      ${topics.map(t => {
        const s = subs.find(x => x.id === t.subjectId);
        return `
        <tr>
          <td><input class="editTopic" data-tid="${t.id}" value="${t.name}"></td>
          <td>${s ? s.name : ''}</td>
          <td>
            <button class="btn btn-light delTopic" data-tid="${t.id}">Delete</button>
          </td>
        </tr>`;
      }).join('')}
    `;

    document.querySelectorAll('.editTopic').forEach(inp => {
      inp.onchange = () => DB.updateTopic(inp.dataset.tid, inp.value.trim());
    });

    document.querySelectorAll('.delTopic').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Delete topic?')) {
          DB.deleteTopic(btn.dataset.tid);
          loadDashboard();
        }
      }
    });
  }

  addTopicBtn.onclick = () => {
    const subjectId = topicSubjectSelect.value;
    const name = newTopicName.value.trim();
    if (!name) return;
    DB.addTopic(subjectId, name);
    newTopicName.value = '';
    loadDashboard();
  };

  // ---------------- QUESTION CRUD ----------------
  function loadQuestionsSelectors() {
    const subs = DB.listSubjects();
    qSubjectSelect.innerHTML = subs.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

    qSubjectSelect.onchange = () => populateTopicsForQuestions(qSubjectSelect.value);
    populateTopicsForQuestions(qSubjectSelect.value);
  }

  function populateTopicsForQuestions(subId) {
    const tops = DB.listTopics(subId);
    qTopicSelect.innerHTML = tops.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  }

  function loadQuestions() {
    const qs = DB.listQuestions();
    const subs = DB.listSubjects();
    const tops = DB.listTopics();

    questionsTable.innerHTML = `
      <tr><th>Question</th><th>Sub</th><th>Topic</th><th>Actions</th></tr>
      ${qs.map(q => {
        const s = subs.find(x => x.id === q.subjectId);
        const t = tops.find(x => x.id === q.topicId);
        return `
        <tr>
          <td>${q.question.slice(0,60)}</td>
          <td>${s ? s.name : ''}</td>
          <td>${t ? t.name : ''}</td>
          <td>
            <button class="btn btn-light editQ" data-qid="${q.id}">Edit</button>
            <button class="btn delQ" data-qid="${q.id}">Del</button>
          </td>
        </tr>`;
      }).join('')}
    `;

    document.querySelectorAll('.delQ').forEach(btn => {
      btn.onclick = () => {
        if (confirm('Delete question?')) {
          DB.deleteQuestion(btn.dataset.qid);
          loadDashboard();
        }
      }
    });

    document.querySelectorAll('.editQ').forEach(btn => {
      btn.onclick = () => openQuestionEditor(btn.dataset.qid);
    });
  }

  newQBtn.onclick = () => openQuestionEditor(null);

  function openQuestionEditor(qid) {
    const existing = qid ? DB.listQuestions({}).find(q => q.id === qid) : null;
    const subs = DB.listSubjects();
    const tops = DB.listTopics();

    const modal = document.createElement('div');
    modal.className = 'modal';

    modal.innerHTML = `
      <div class="modal-content">
        <h3>${qid ? 'Edit' : 'Add'} Question</h3>
        <label>Subject</label>
        <select id="qSubSel">
          ${subs.map(s => `<option value="${s.id}" ${existing && s.id===existing.subjectId?'selected':''}>${s.name}</option>`).join('')}
        </select>

        <label>Topic</label>
        <select id="qTopSel">
          ${tops.map(t => `<option value="${t.id}" ${existing && t.id===existing.topicId?'selected':''}>${t.name}</option>`).join('')}
        </select>

        <label>Question</label>
        <textarea id="qText">${existing ? existing.question : ''}</textarea>

        <label>Choices (one per line)</