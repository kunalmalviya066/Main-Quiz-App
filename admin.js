/* admin.js
   Full admin logic for QuizLab.
   - Admin login with attempts & 10-minute lockout
   - Manage Subjects (search, add, edit, delete)
   - Manage Topics (search, add, edit, delete)
   - Manage Questions (filter, add, edit, delete)
   - CSV import/export for questions
   - Full DB JSON export
   - Change admin password (verifies current password)
   - View user attempt history
   - Base64 image upload (file -> base64) appended to question modal
   - Automatic localStorage sync via QA_DB._save()
   - Uses QA_DB API from db.js
*/

(function () {
  // --- Helpers ---
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function uid(prefix = '') {
    return prefix + Date.now() + '_' + Math.floor(Math.random() * 10000);
  }
  function download(filename, content, mime = 'application/json') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  // Robust CSV parse (handles quoted fields)
  function parseCSV(text) {
    const rows = [];
    let cur = [];
    let i = 0;
    const len = text.length;
    let field = '';
    let inQuotes = false;
    while (i < len) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          field += ch;
          i++;
          continue;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
          continue;
        }
        if (ch === ',') {
          cur.push(field);
          field = '';
          i++;
          continue;
        }
        if (ch === '\r') {
          i++;
          continue;
        }
        if (ch === '\n') {
          cur.push(field);
          rows.push(cur);
          cur = [];
          field = '';
          i++;
          continue;
        }
        field += ch;
        i++;
      }
    }
    // push last
    if (field !== '' || cur.length) {
      cur.push(field);
      rows.push(cur);
    }
    return rows;
  }
  // CSV stringify (simple)
  function csvEscapeField(s) {
    if (s == null) return '';
    const str = String(s);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // --- Elements ---
  const loginSection = document.getElementById('admin-login-section');
  const lockoutSection = document.getElementById('admin-lockout-section');
  const dashboard = document.getElementById('admin-dashboard');

  const loginPwd = document.getElementById('admin-password');
  const loginBtn = document.getElementById('admin-login-btn');
  const loginError = document.getElementById('admin-login-error');
  const lockoutTimerEl = document.getElementById('lockout-timer');

  const navButtons = Array.from(document.querySelectorAll('.admin-nav button[data-target]'));
  const panels = Array.from(document.querySelectorAll('.admin-panel'));
  const logoutBtn = document.getElementById('admin-logout');

  // Subjects
  const searchSubjects = document.getElementById('search-subjects');
  const subjectsTable = document.getElementById('subjects-table');
  const addSubjectBtn = document.getElementById('add-subject-btn');

  // Topics
  const searchTopics = document.getElementById('search-topics');
  const topicsTable = document.getElementById('topics-table');
  const addTopicBtn = document.getElementById('add-topic-btn');

  // Questions
  const filterQuestionSubject = document.getElementById('filter-question-subject');
  const filterQuestionTopic = document.getElementById('filter-question-topic');
  const filterQuestionBtn = document.getElementById('filter-question-btn');
  const questionsTable = document.getElementById('questions-table');
  const addQuestionBtn = document.getElementById('add-question-btn');

  // CSV
  const csvFileInput = document.getElementById('csv-file');
  const importCsvBtn = document.getElementById('import-csv-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');

  // Export JSON
  const exportJsonBtn = document.getElementById('export-json-btn');

  // Settings
  const currentAdminPass = document.getElementById('current-admin-pass');
  const newAdminPass = document.getElementById('new-admin-pass');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const settingsMsg = document.getElementById('settings-msg');

  // History
  const adminHistoryList = document.getElementById('admin-history-list');

  // Modals
  const modalSubject = document.getElementById('modal-subject');
  const modalSubjectTitle = document.getElementById('modal-subject-title');
  const modalSubjectName = document.getElementById('modal-subject-name');
  const modalSubjectDesc = document.getElementById('modal-subject-desc');
  const closeModalSubject = document.getElementById('close-modal-subject');
  const saveModalSubject = document.getElementById('save-modal-subject');

  const modalTopic = document.getElementById('modal-topic');
  const modalTopicTitle = document.getElementById('modal-topic-title');
  const modalTopicSubject = document.getElementById('modal-topic-subject');
  const modalTopicName = document.getElementById('modal-topic-name');
  const closeModalTopic = document.getElementById('close-modal-topic');
  const saveModalTopic = document.getElementById('save-modal-topic');

  const modalQuestion = document.getElementById('modal-question');
  const modalQuestionTitle = document.getElementById('modal-question-title');
  const modalQuestionSubject = document.getElementById('modal-question-subject');
  const modalQuestionTopic = document.getElementById('modal-question-topic');
  const modalQuestionText = document.getElementById('modal-question-text');
  const modalQuestionChoices = document.getElementById('modal-question-choices');
  const modalQuestionAnswer = document.getElementById('modal-question-answer');
  const modalQuestionImage = document.getElementById('modal-question-image');
  const closeModalQuestion = document.getElementById('close-modal-question');
  const saveModalQuestion = document.getElementById('save-modal-question');

  // runtime
  let adminState = {
    loggedIn: false,
    editingSubjectId: null,
    editingTopicId: null,
    editingQuestionId: null
  };

  // --- Initialization / Login Lock handling ---
  function getLockObj() {
    // ensure structure present
    const s = QA_DB._db.settings || (QA_DB._db.settings = {});
    if (!s.adminLock) s.adminLock = { attempts: 0, lockedUntil: null };
    return s.adminLock;
  }

  function updateLockUI() {
    const lock = getLockObj();
    const now = Date.now();
    if (lock.lockedUntil && now < lock.lockedUntil) {
      // locked
      const remainingMs = lock.lockedUntil - now;
      lockoutTimerEl.textContent = msToClock(remainingMs);
      showLockout();
      startLockoutCountdown();
      return true;
    } else {
      // not locked
      lock.lockedUntil = null;
      lock.attempts = Math.min(lock.attempts, 2);
      QA_DB._save();
      hideLockout();
      return false;
    }
  }

  let lockInterval = null;
  function startLockoutCountdown() {
    if (lockInterval) return;
    lockInterval = setInterval(() => {
      const lock = getLockObj();
      if (!lock.lockedUntil) {
        clearInterval(lockInterval);
        lockInterval = null;
        updateLockUI();
        return;
      }
      const rem = lock.lockedUntil - Date.now();
      if (rem <= 0) {
        lock.lockedUntil = null;
        lock.attempts = 0;
        QA_DB._save();
        clearInterval(lockInterval);
        lockInterval = null;
        updateLockUI();
        return;
      }
      lockoutTimerEl.textContent = msToClock(rem);
    }, 1000);
  }

  function msToClock(ms) {
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }

  function showLockout() {
    loginSection.classList.add('hidden');
    lockoutSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
  function hideLockout() {
    lockoutSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  }
  function showDashboard() {
    loginSection.classList.add('hidden');
    lockoutSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
    adminState.loggedIn = true;
    // show default panel
    openPanel('panel-subjects');
    refreshAll();
  }
  function showLogin() {
    adminState.loggedIn = false;
    dashboard.classList.add('hidden');
    lockoutSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  }

  // check lock on load
  updateLockUI();

  // --- Login Flow ---
  loginBtn.addEventListener('click', () => {
    const pwd = loginPwd.value || '';
    loginError.textContent = '';
    // check lock
    const lock = getLockObj();
    const now = Date.now();
    if (lock.lockedUntil && now < lock.lockedUntil) {
      updateLockUI();
      return;
    }
    if (QA_DB.verifyAdmin(pwd)) {
      // success
      lock.attempts = 0;
      lock.lockedUntil = null;
      QA_DB._save();
      loginPwd.value = '';
      showDashboard();
    } else {
      // fail
      lock.attempts = (lock.attempts || 0) + 1;
      QA_DB._save();
      const attemptsLeft = Math.max(0, 3 - lock.attempts);
      loginError.textContent = `Invalid password. ${attemptsLeft} attempt(s) left.`;
      if (lock.attempts >= 3) {
        lock.lockedUntil = Date.now() + (10 * 60 * 1000); // 10 minutes
        QA_DB._save();
        updateLockUI();
      }
    }
  });

  // --- Dashboard navigation ---
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      openPanel(btn.dataset.target);
    });
  });

  function openPanel(panelId) {
    panels.forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(panelId);
    if (target) target.classList.remove('hidden');
    // specific refresh hooks
    if (panelId === 'panel-subjects') renderSubjectsTable();
    if (panelId === 'panel-topics') renderTopicsTable();
    if (panelId === 'panel-questions') {
      populateQuestionFilters();
      renderQuestionsTable();
    }
    if (panelId === 'panel-history') renderHistoryPanel();
    // clear messages
    if (panelId === 'panel-settings') settingsMsg.textContent = '';
  }

  // --- Logout ---
  logoutBtn.addEventListener('click', () => {
    if (confirm('Logout admin?')) {
      adminState.loggedIn = false;
      showLogin();
    }
  });

  // --- Subjects CRUD ---
  function renderSubjectsTable(filter = '') {
    const subjects = QA_DB.getSubjects();
    const rows = subjects
      .filter(s => s.name.toLowerCase().includes(filter.toLowerCase()) || (s.desc || '').toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
    subjectsTable.innerHTML = '';
    const thead = el('thead','','<tr><th>Name</th><th>Description</th><th>Actions</th></tr>');
    subjectsTable.appendChild(thead);
    const tbody = el('tbody','');
    rows.forEach(s => {
      const tr = el('tr','');
      const tdName = el('td','', s.name);
      const tdDesc = el('td','', s.desc || '');
      const tdActions = el('td','');
      const editBtn = el('button','btn','Edit');
      const delBtn = el('button','btn','Delete');
      editBtn.addEventListener('click', ()=> openSubjectModal('edit', s));
      delBtn.addEventListener('click', ()=> {
        if (!confirm(`Delete subject "${s.name}"? This will not delete questions automatically.`)) return;
        // remove subject
        QA_DB._db.subjects = QA_DB._db.subjects.filter(x => x.id !== s.id);
        // also optionally remove topics belonging to it and questions - choose to remove topics and questions to keep consistent
        QA_DB._db.topics = QA_DB._db.topics.filter(t => t.subjectId !== s.id);
        QA_DB._db.questions = QA_DB._db.questions.filter(q => q.subjectId !== s.id);
        QA_DB._save();
        renderSubjectsTable(searchSubjects.value);
        renderTopicsTable(searchTopics.value);
        renderQuestionsTable();
      });
      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);
      tr.appendChild(tdName);
      tr.appendChild(tdDesc);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
    subjectsTable.appendChild(tbody);
  }

  addSubjectBtn.addEventListener('click', ()=> openSubjectModal('add'));

  function openSubjectModal(mode, subject = null) {
    modalSubjectTitle.textContent = mode === 'add' ? 'Add Subject' : 'Edit Subject';
    modalSubjectName.value = subject ? subject.name : '';
    modalSubjectDesc.value = subject ? subject.desc || '' : '';
    adminState.editingSubjectId = subject ? subject.id : null;
    modalSubject.classList.remove('hidden');
  }
  closeModalSubject.addEventListener('click', ()=> modalSubject.classList.add('hidden'));
  saveModalSubject.addEventListener('click', ()=>{
    const name = modalSubjectName.value.trim();
    const desc = modalSubjectDesc.value.trim();
    if (!name) { alert('Name required'); return; }
    if (adminState.editingSubjectId) {
      // edit
      const subj = QA_DB.findSubject(adminState.editingSubjectId);
      if (subj) {
        subj.name = name;
        subj.desc = desc;
        QA_DB._save();
      }
    } else {
      // add
      const id = 'sub_' + uid();
      QA_DB._db.subjects.push({ id, name, desc });
      QA_DB._save();
    }
    modalSubject.classList.add('hidden');
    renderSubjectsTable(searchSubjects.value);
    populateQuestionFilters();
    renderTopicsTable(searchTopics.value);
  });

  searchSubjects.addEventListener('input', ()=> renderSubjectsTable(searchSubjects.value));

  // --- Topics CRUD ---
  function renderTopicsTable(filter = '') {
    const topics = QA_DB.getTopics();
    const subjects = QA_DB.getSubjects();
    const rows = topics
      .filter(t => t.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a,b) => a.name.localeCompare(b.name));
    topicsTable.innerHTML = '';
    const thead = el('thead','','<tr><th>Name</th><th>Subject</th><th>Actions</th></tr>');
    topicsTable.appendChild(thead);
    const tbody = el('tbody','');
    rows.forEach(t => {
      const subj = QA_DB.findSubject(t.subjectId);
      const tr = el('tr','');
      tr.appendChild(el('td','', t.name));
      tr.appendChild(el('td','', subj ? subj.name : '—'));
      const tdActions = el('td','');
      const editBtn = el('button','btn','Edit');
      const delBtn = el('button','btn','Delete');
      editBtn.addEventListener('click', ()=> openTopicModal('edit', t));
      delBtn.addEventListener('click', ()=> {
        if(!confirm(`Delete topic "${t.name}"? This will also remove questions under this topic.`)) return;
        QA_DB._db.topics = QA_DB._db.topics.filter(x => x.id !== t.id);
        QA_DB._db.questions = QA_DB._db.questions.filter(q => q.topicId !== t.id);
        QA_DB._save();
        renderTopicsTable(searchTopics.value);
        renderQuestionsTable();
      });
      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
    topicsTable.appendChild(tbody);
  }

  addTopicBtn.addEventListener('click', ()=> openTopicModal('add'));

  function openTopicModal(mode, topic = null) {
    modalTopicTitle.textContent = mode === 'add' ? 'Add Topic' : 'Edit Topic';
    // populate subject select
    populateSubjectSelect(modalTopicSubject, true);
    modalTopicName.value = topic ? topic.name : '';
    adminState.editingTopicId = topic ? topic.id : null;
    if (topic) modalTopicSubject.value = topic.subjectId;
    modalTopic.classList.remove('hidden');
  }
  closeModalTopic.addEventListener('click', ()=> modalTopic.classList.add('hidden'));
  saveModalTopic.addEventListener('click', ()=>{
    const name = modalTopicName.value.trim();
    const subjectId = modalTopicSubject.value;
    if (!name) { alert('Name required'); return; }
    if (!subjectId) { alert('Select subject'); return; }
    if (adminState.editingTopicId) {
      const t = QA_DB._db.topics.find(x => x.id === adminState.editingTopicId);
      if (t) {
        t.name = name;
        t.subjectId = subjectId;
        QA_DB._save();
      }
    } else {
      const id = 't_' + uid();
      QA_DB._db.topics.push({ id, name, subjectId });
      QA_DB._save();
    }
    modalTopic.classList.add('hidden');
    renderTopicsTable(searchTopics.value);
    populateQuestionFilters();
    renderSubjectsTable(searchSubjects.value);
  });

  searchTopics.addEventListener('input', ()=> renderTopicsTable(searchTopics.value));

  // --- Questions CRUD ---
  function populateQuestionFilters() {
    // subjects
    const subs = QA_DB.getSubjects();
    filterQuestionSubject.innerHTML = '';
    const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'All Subjects';
    filterQuestionSubject.appendChild(optAll);
    subs.forEach(s => {
      const o = document.createElement('option'); o.value = s.id; o.textContent = s.name;
      filterQuestionSubject.appendChild(o);
    });
    // topics
    refreshTopicFilterOptions();
    // also populate modal selects
    populateSubjectSelect(modalQuestionSubject);
    modalQuestionSubject.addEventListener('change', ()=> refreshModalTopicOptions(modalQuestionTopic, modalQuestionSubject.value));
    // also for modal topic (populate initially)
    refreshModalTopicOptions(modalQuestionTopic, modalQuestionSubject.value);
  }

  function refreshTopicFilterOptions(subjectId = '') {
    const topics = QA_DB.getTopics();
    filterQuestionTopic.innerHTML = '';
    const optAll = document.createElement('option'); optAll.value = ''; optAll.textContent = 'All Topics';
    filterQuestionTopic.appendChild(optAll);
    topics.filter(t => !subjectId || t.subjectId === subjectId).forEach(t => {
      const o = document.createElement('option'); o.value = t.id; o.textContent = t.name;
      filterQuestionTopic.appendChild(o);
    });
  }

  filterQuestionSubject.addEventListener('change', ()=> {
    const sid = filterQuestionSubject.value;
    refreshTopicFilterOptions(sid);
  });

  filterQuestionBtn.addEventListener('click', ()=> renderQuestionsTable());

  function renderQuestionsTable() {
    const subjectId = filterQuestionSubject.value;
    const topicId = filterQuestionTopic.value;
    let questions = QA_DB.getQuestions({ subjectIds: subjectId ? [subjectId] : null, topicIds: topicId ? [topicId] : null });
    // build table
    questionsTable.innerHTML = '';
    const thead = el('thead','','<tr><th>#</th><th>Subject</th><th>Topic</th><th>Question</th><th>Actions</th></tr>');
    questionsTable.appendChild(thead);
    const tbody = el('tbody','');
    questions.forEach((q, idx) => {
      const subj = QA_DB.findSubject(q.subjectId);
      const topic = QA_DB.getTopics().find(t => t.id === q.topicId) || { name: '—' };
      const tr = el('tr','');
      tr.appendChild(el('td','', (idx+1).toString()));
      tr.appendChild(el('td','', subj ? subj.name : '—'));
      tr.appendChild(el('td','', topic.name));
      const qtext = q.text.length > 120 ? q.text.slice(0, 120) + '…' : q.text;
      tr.appendChild(el('td','', qtext));
      const tdActions = el('td','');
      const viewBtn = el('button','btn','View');
      const editBtn = el('button','btn','Edit');
      const delBtn = el('button','btn','Delete');
      viewBtn.addEventListener('click', ()=> viewQuestion(q));
      editBtn.addEventListener('click', ()=> openQuestionModal('edit', q));
      delBtn.addEventListener('click', ()=> {
        if(!confirm('Delete this question?')) return;
        QA_DB._db.questions = QA_DB._db.questions.filter(x => x.id !== q.id);
        QA_DB._save();
        renderQuestionsTable();
      });
      tdActions.appendChild(viewBtn);
      tdActions.appendChild(editBtn);
      tdActions.appendChild(delBtn);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
    questionsTable.appendChild(tbody);
  }

  addQuestionBtn.addEventListener('click', ()=> openQuestionModal('add'));

  function openQuestionModal(mode, question = null) {
    modalQuestionTitle.textContent = mode === 'add' ? 'Add Question' : 'Edit Question';
    // populate selects
    populateSubjectSelect(modalQuestionSubject, true);
    refreshModalTopicOptions(modalQuestionTopic, modalQuestionSubject.value);
    modalQuestionText.value = question ? question.text : '';
    modalQuestionChoices.value = question ? (question.choices || []).join('\n') : '';
    modalQuestionAnswer.value = (question && typeof question.answer === 'number') ? question.answer : 0;
    modalQuestionImage.value = question ? (question.image || '') : '';
    adminState.editingQuestionId = question ? question.id : null;
    // Attach a dynamic file input to allow base64 upload
    attachImageFileInput();
    modalQuestion.classList.remove('hidden');
  }

  function attachImageFileInput(){
    // If already attached, skip
    if (modalQuestion.querySelector('.js-image-file')) return;
    const wrapper = el('div','', '');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.className = 'js-image-file';
    const hint = el('div','muted','Choose an image file to convert to Base64 (optional). The Base64 data will be placed into the Image field.');
    fileInput.addEventListener('change', (ev) => {
      const f = ev.target.files[0];
      if(!f) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        modalQuestionImage.value = e.target.result;
      };
      reader.readAsDataURL(f);
    });
    wrapper.appendChild(hint);
    wrapper.appendChild(fileInput);
    // insert before modal buttons
    modalQuestion.querySelector('.form-row').parentNode.insertBefore(wrapper, modalQuestion.querySelector('.form-row'));
  }

  closeModalQuestion.addEventListener('click', ()=> {
    // remove dynamic file input wrapper if present
    const fileInput = modalQuestion.querySelector('.js-image-file');
    if (fileInput) {
      fileInput.remove();
      // remove its wrapper (two nodes up maybe)
      // safe approach: clear the modal and repopulate next open
      const wrappers = Array.from(modalQuestion.querySelectorAll('input.js-image-file'));
      wrappers.forEach(fi => fi.remove());
      // also remove any preceding hint nodes (muted) — we won't worry, they are small
    }
    modalQuestion.classList.add('hidden');
  });

  saveModalQuestion.addEventListener('click', ()=> {
    const subjectId = modalQuestionSubject.value;
    const topicId = modalQuestionTopic.value;
    const text = modalQuestionText.value.trim();
    const choicesText = modalQuestionChoices.value.trim();
    const answerIdx = parseInt(modalQuestionAnswer.value, 10);
    const image = modalQuestionImage.value.trim() || null;
    if (!subjectId) { alert('Select subject'); return; }
    if (!topicId) { alert('Select topic'); return; }
    if (!text) { alert('Question text required'); return; }
    if (!choicesText) { alert('Provide choices, one per line'); return; }
    const choices = choicesText.split('\n').map(s => s.trim()).filter(Boolean);
    if (choices.length < 2) { alert('At least two choices needed'); return; }
    if (isNaN(answerIdx) || answerIdx < 0 || answerIdx >= choices.length) { alert('Answer index out of range'); return; }

    if (adminState.editingQuestionId) {
      // edit existing
      const q = QA_DB._db.questions.find(x => x.id === adminState.editingQuestionId);
      if (q) {
        q.subjectId = subjectId;
        q.topicId = topicId;
        q.text = text;
        q.choices = choices;
        q.answer = answerIdx;
        q.image = image;
        QA_DB._save();
      }
    } else {
      // add
      const id = 'q_' + uid();
      QA_DB._db.questions.push({
        id,
        subjectId,
        topicId,
        text,
        choices,
        answer: answerIdx,
        image,
        meta: {}
      });
      QA_DB._save();
    }
    modalQuestion.classList.add('hidden');
    // cleanup dynamic file input wrapper(s)
    const fileInputs = modalQuestion.querySelectorAll('input.js-image-file');
    fileInputs.forEach(fi => fi.remove());
    renderQuestionsTable();
  });

  function refreshModalTopicOptions(selectEl, subjectId) {
    selectEl.innerHTML = '';
    const topics = QA_DB.getTopics();
    const filtered = topics.filter(t => !subjectId || t.subjectId === subjectId);
    if (filtered.length === 0) {
      const o = document.createElement('option'); o.value = ''; o.textContent = 'No topics';
      selectEl.appendChild(o);
    } else {
      filtered.forEach(t => {
        const o = document.createElement('option'); o.value = t.id; o.textContent = t.name;
        selectEl.appendChild(o);
      });
    }
  }

  function populateSubjectSelect(selectEl, includePlaceholder = false) {
    selectEl.innerHTML = '';
    if (includePlaceholder) {
      const ph = document.createElement('option'); ph.value = ''; ph.textContent = '-- Select subject --';
      selectEl.appendChild(ph);
    }
    QA_DB.getSubjects().forEach(s => {
      const o = document.createElement('option'); o.value = s.id; o.textContent = s.name;
      selectEl.appendChild(o);
    });
  }

  function viewQuestion(q) {
    // show a quick read-only view in an alert-like modal (simple)
    let html = `Question: ${q.text}\n\n`;
    q.choices.forEach((c, i) => {
      const marker = (i === q.answer) ? ' (correct)' : '';
      html += `${i}. ${c}${marker}\n`;
    });
    if (q.image) html += `\n[Has image attached]`;
    alert(html);
  }

  // --- CSV Import / Export ---
  importCsvBtn.addEventListener('click', () => {
    const file = csvFileInput.files[0];
    if (!file) {
      alert('Choose a CSV file first.');
      return;
    }
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const rows = parseCSV(e.target.result);
        // Expect first row possibly header; try to detect header
        let header = rows[0].map(h => (h || '').toString().toLowerCase());
        let startIdx = 0;
        const headerExpected = ['subjectid','topicid','text'];
        const hasHeader = headerExpected.every(h => header.includes(h));
        if (hasHeader) startIdx = 1;
        let added = 0;
        for (let i = startIdx; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;
          const subjectId = row[0].trim();
          const topicId = row[1].trim();
          const text = row[2].trim();
          const choices = [];
          let answerIndex = 0;
          if (row.length > 3) {
            // remaining columns except maybe last column as answer index or image detection
            // We'll try: last column if numeric -> answerIndex; else treat all cols 3..n-1 as choices and last as maybe answer
            for (let c = 3; c < row.length; c++) {
              const val = row[c];
              // treat numeric-only single column as answer if not obviously choice
              if (c === row.length - 1 && /^\d+$/.test((val||'').trim()) && choices.length >= 2) {
                answerIndex = parseInt(val, 10);
              } else {
                choices.push(val);
              }
            }
          }
          // ensure subject/topic exist; if not, create them
          let subj = QA_DB._db.subjects.find(s => s.id === subjectId);
          if (!subj) {
            // create subject with given id (if id provided)
            const newSid = subjectId || ('sub_' + uid());
            subj = { id: newSid, name: subjectId || `Subject ${newSid}`, desc: '' };
            QA_DB._db.subjects.push(subj);
          }
          let topic = QA_DB._db.topics.find(t => t.id === topicId);
          if (!topic) {
            const newTid = topicId || ('t_' + uid());
            topic = { id: newTid, subjectId: subj.id, name: topicId || `Topic ${newTid}` };
            QA_DB._db.topics.push(topic);
          }
          // if choices empty, create simple A/B/C/D from a single field with '|' delimiter
          if (choices.length === 0) {
            // maybe the row[3] had pipe-separated choices
            const maybe = row[3] || '';
            const parts = maybe.split('|').map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) choices.push(...parts);
            else {
              // fallback simple binary choices
              choices.push('True', 'False');
            }
          }
          const qid = 'q_' + uid();
          const qobj = { id: qid, subjectId: subj.id, topicId: topic.id, text, choices, answer: Math.max(0, Math.min(answerIndex, choices.length - 1)), image: null, meta: {} };
          QA_DB._db.questions.push(qobj);
          added++;
        }
        QA_DB._save();
        alert(`Imported ${added} questions from CSV.`);
        renderQuestionsTable();
      } catch (e) {
        console.error(e);
        alert('Failed to parse CSV: ' + e.message);
      }
    };
    reader.readAsText(file);
  });

  exportCsvBtn.addEventListener('click', () => {
    // Collect all questions and produce CSV rows
    const rows = [];
    // header
    const header = ['subjectId', 'topicId', 'text'];
    // find max choice columns across questions
    const questions = QA_DB.getQuestions();
    let maxChoices = 0;
    questions.forEach(q => maxChoices = Math.max(maxChoices, (q.choices || []).length));
    for (let i = 1; i <= maxChoices; i++) header.push('choice' + i);
    header.push('answerIndex');
    header.push('image');
    rows.push(header);
    questions.forEach(q => {
      const row = [];
      row.push(q.subjectId);
      row.push(q.topicId);
      row.push(q.text);
      for (let i = 0; i < maxChoices; i++) {
        row.push(q.choices[i] || '');
      }
      row.push(typeof q.answer === 'number' ? String(q.answer) : '');
      row.push(q.image || '');
      rows.push(row);
    });
    // convert to CSV text
    const csv = rows.map(r => r.map(csvEscapeField).join(',')).join('\n');
    download('quizlab_questions.csv', csv, 'text/csv');
  });

  // --- JSON Export ---
  exportJsonBtn.addEventListener('click', () => {
    const json = QA_DB.exportJSON();
    download('quizlab_db_export.json', json, 'application/json');
  });

  // --- Admin Settings: password change ---
  changePasswordBtn.addEventListener('click', () => {
    const current = currentAdminPass.value || '';
    const neu = newAdminPass.value || '';
    settingsMsg.textContent = '';
    if (!current || !neu) { settingsMsg.textContent = 'Both fields required.'; return; }
    const ok = QA_DB.changeAdminPassword(current, neu);
    if (ok) {
      settingsMsg.textContent = 'Password changed successfully.';
      currentAdminPass.value = '';
      newAdminPass.value = '';
    } else {
      settingsMsg.textContent = 'Current password incorrect.';
    }
  });

  // --- History viewer ---
  function renderHistoryPanel() {
    const arr = QA_DB.getHistory().slice().reverse();
    adminHistoryList.innerHTML = '';
    if (arr.length === 0) {
      adminHistoryList.textContent = 'No attempts recorded.';
      return;
    }
    arr.forEach(a => {
      const card = el('div','card');
      card.innerHTML = `<strong>${a.title}</strong><div class="muted">${new Date(a.timestamp).toLocaleString()}</div>
        <div>Score: ${a.score}% • ${a.correct}/${a.total} • Time: ${formatSec(a.timeTaken)}</div>`;
      const viewBtn = el('button','btn','View');
      viewBtn.addEventListener('click', ()=> {
        // show details in alert (simple)
        let txt = `Attempt: ${a.title}\nTaken: ${new Date(a.timestamp).toLocaleString()}\nScore: ${a.score}%\nCorrect: ${a.correct}/${a.total}\nTime: ${formatSec(a.timeTaken)}\n\nQuestions:\n`;
        a.review.forEach(r => {
          txt += `Q${r.index}: ${r.question.text}\nSelected: ${r.selected === null ? 'None' : (r.question.choices[r.selected] || '—')}\nCorrect: ${r.question.choices[r.correct]}\n\n`;
        });
        alert(txt);
      });
      card.appendChild(viewBtn);
      adminHistoryList.appendChild(card);
    });
  }

  // --- Utilities ---
  function formatSec(s) {
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${mm}m ${ss}s`;
  }

  // refresh all lists
  function refreshAll() {
    renderSubjectsTable();
    renderTopicsTable();
    populateQuestionFilters();
    renderQuestionsTable();
    renderHistoryPanel();
  }

  // small debounce utility
  function debounce(fn, wait = 200) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  // search debounce
  searchSubjects.addEventListener('input', debounce(() => renderSubjectsTable(searchSubjects.value), 200));
  searchTopics.addEventListener('input', debounce(() => renderTopicsTable(searchTopics.value), 200));

  // --- CSV file drag/drop convenience on the whole panel (optional) ---
  (function attachCsvDrop() {
    const panel = document.getElementById('panel-csv');
    if (!panel) return;
    panel.addEventListener('dragover', (e) => { e.preventDefault(); panel.style.outline = '2px dashed rgba(255,182,193,0.6)'; });
    panel.addEventListener('dragleave', (e) => { e.preventDefault(); panel.style.outline = 'none'; });
    panel.addEventListener('drop', (e) => {
      e.preventDefault();
      panel.style.outline = 'none';
      const file = e.dataTransfer.files[0];
      if (file && file.name.toLowerCase().endsWith('.csv')) {
        csvFileInput.files = e.dataTransfer.files;
        alert('CSV file attached — click Import CSV to proceed.');
      }
    });
  })();

  // finally, ensure UI populated if admin was already logged in previously
  // (for demo we require login each time; but if you want persistent session, you can alter)
  // But ensure that if lockout is active on page load, we show lockout
  if (!updateLockUI()) {
    showLogin();
  }

  // Expose small debug helpers on window
  window.QuizLabAdmin = {
    refreshAll,
    openPanel,
    QA_DB
  };

})();
