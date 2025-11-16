// admin.js
import * as DB from './db.js';
import { $, $all, uid } from './utils.js';

const loginCard = $('#login-card');
const dashboard = $('#admin-dashboard');
const loginMsg = $('#login-msg');

const adminLoginBtn = $('#admin-login');
const adminUser = $('#admin-user');
const adminPass = $('#admin-pass');
const btnLogout = $('#btn-logout');

const openSubjects = $('#open-subjects');
const openTopics = $('#open-topics');
const openQuestions = $('#open-questions');
const adminMain = $('#admin-main-area');

const exportJsonBtn = $('#export-json');
const importJsonBtn = $('#import-json');

function checkAuth(){
  const db = DB.getDB();
  const authed = sessionStorage.getItem('quizlab_admin') === '1';
  if(authed){
    loginCard.classList.add('hidden');
    dashboard.classList.remove('hidden');
  } else {
    loginCard.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}
checkAuth();

adminLoginBtn.addEventListener('click', ()=>{
  const user = adminUser.value.trim();
  const pass = adminPass.value || '';
  const db = DB.getDB();
  const ok = (user === db.admin.username && btoa(pass) === db.admin.passwordHash);
  if(ok){
    sessionStorage.setItem('quizlab_admin','1');
    checkAuth();
    renderDashboard();
  } else {
    loginMsg.textContent = 'Invalid credentials';
  }
});

btnLogout.addEventListener('click', ()=>{
  sessionStorage.removeItem('quizlab_admin');
  checkAuth();
});

function renderDashboard(){
  adminMain.innerHTML = `
    <div class="card">
      <h3>Quick Stats</h3>
      <div id="stats-grid" class="grid-cards"></div>
    </div>
  `;
  const statsGrid = $('#stats-grid');
  const db = DB.getDB();
  const cards = [
    {title:'Subjects', value: db.subjects.length},
    {title:'Topics', value: db.topics.length},
    {title:'Questions', value: db.questions.length},
    {title:'User Tests', value: (db.users||[]).length}
  ];
  cards.forEach(c=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h4>${c.title}</h4><p style="font-size:1.4rem;font-weight:700">${c.value}</p>`;
    statsGrid.appendChild(card);
  });
}

/* Subjects management view */
openSubjects.addEventListener('click', ()=>{
  const subs = DB.listSubjects();
  adminMain.innerHTML = `<div class="card"><h3>Subjects</h3><div id="subs-list"></div>
    <div class="form-row"><input id="new-sub-name" placeholder="New subject name" /></div>
    <div class="form-row"><button id="create-sub" class="btn primary">Create Subject</button></div>
  </div>`;
  const subsList = $('#subs-list');
  subs.forEach(s=>{
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center">
      <div><strong>${s.name}</strong></div>
      <div>
        <button data-id="${s.id}" class="btn edit-sub">Edit</button>
        <button data-id="${s.id}" class="btn danger del-sub">Delete</button>
      </div>
    </div>`;
    subsList.appendChild(el);
  });
  $('#create-sub').addEventListener('click', ()=>{
    const name = $('#new-sub-name').value.trim();
    if(!name) return alert('Name required');
    DB.addSubject(name);
    openSubjects.click(); // refresh
  });
  $all('.del-sub').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      if(confirm('Delete subject and its topics/questions?')) {
        DB.deleteSubject(id);
        openSubjects.click();
      }
    });
  });
  $all('.edit-sub').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const newName = prompt('New subject name', (DB.listSubjects().find(s=>s.id===id)||{}).name);
      if(newName) { DB.updateSubject(id, newName); openSubjects.click(); }
    });
  });
});

/* Topics management view */
openTopics.addEventListener('click', ()=>{
  const topics = DB.listTopics();
  adminMain.innerHTML = `<div class="card"><h3>Topics</h3><div id="topics-list"></div>
    <div class="form-row"><select id="topic-subject"></select></div>
    <div class="form-row"><input id="new-topic-name" placeholder="New topic name" /></div>
    <div class="form-row"><button id="create-topic" class="btn primary">Create Topic</button></div>
  </div>`;
  const topicSubject = $('#topic-subject');
  DB.listSubjects().forEach(s=>{
    const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; topicSubject.appendChild(o);
  });
  const topicsList = $('#topics-list');
  DB.listTopics().forEach(t=>{
    const el = document.createElement('div'); el.className='card';
    el.innerHTML = `<div style="display:flex;justify-content:space-between">
      <div><strong>${t.name}</strong><div class="muted">Subject: ${(DB.listSubjects().find(s=>s.id===t.subjectId)||{}).name}</div></div>
      <div>
        <button data-id="${t.id}" class="btn edit-top">Edit</button>
        <button data-id="${t.id}" class="btn danger del-top">Delete</button>
      </div>
    </div>`;
    topicsList.appendChild(el);
  });
  $('#create-topic').addEventListener('click', ()=>{
    const name = $('#new-topic-name').value.trim();
    const subjectId = topicSubject.value;
    if(!name) return alert('Name required');
    DB.addTopic(subjectId, name);
    openTopics.click();
  });
  $all('.del-top').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      if(confirm('Delete topic and its questions?')) { DB.deleteTopic(id); openTopics.click(); }
    });
  });
  $all('.edit-top').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const newName = prompt('New topic name', (DB.listTopics().find(t=>t.id===id)||{}).name);
      if(newName) { DB.updateTopic(id, newName); openTopics.click(); }
    });
  });
});

/* Questions management view (partial) */
openQuestions.addEventListener('click', ()=>{
  const questions = DB.listQuestions();
  adminMain.innerHTML = `<div class="card">
    <h3>Questions <small class="muted">(${questions.length})</small></h3>
    <div style="margin-bottom:12px"><button id="btn-create-question" class="btn primary">Create Question</button>
      <button id="btn-export-questions" class="btn">Export CSV</button>
    </div>
    <div id="questions-list"></div>
  </div>`;
  const list = $('#questions-list');
  questions.forEach(q=>{
    const el = document.createElement('div'); el.className='card';
    const subj = (DB.listSubjects().find(s=>s.id===q.subjectId)||{}).name || '';
    const topic = (DB.listTopics().find(t=>t.id===q.topicId)||{}).name || '';
    el.innerHTML = `<div style="display:flex;justify-content:space-between">
      <div>
        <strong>Q:</strong> ${q.text.slice(0,120)} <div class="muted">${subj} › ${topic}</div>
      </div>
      <div>
        <button data-id="${q.id}" class="btn edit-q">Edit</button>
        <button data-id="${q.id}" class="btn danger del-q">Delete</button>
      </div>
    </div>`;
    list.appendChild(el);
  });

  $('#btn-create-question').addEventListener('click', ()=>openQuestionEditor());
  $all('.del-q').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(confirm('Delete question?')){
        DB.deleteQuestion(btn.dataset.id);
        openQuestions.click();
      }
    });
  });
  $all('.edit-q').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      openQuestionEditor(btn.dataset.id);
    });
  });

  $('#btn-export-questions').addEventListener('click', ()=>{
    const csv = DB.exportQuestionsCSV();
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'questions.csv'; a.click();
    URL.revokeObjectURL(url);
  });
});

/* Question editor (basic skeleton) */
function openQuestionEditor(questionId=null){
  const isNew = !questionId;
  let q = { text:'', subjectId: '', topicId: '', choices:['','','',''], answerIndex:0, image:''};
  if(!isNew){
    const existing = DB.getQuestion(questionId);
    if(existing) q = existing;
  }
  adminMain.innerHTML = `<div class="card">
    <h3>${isNew ? 'Create' : 'Edit'} Question</h3>
    <div class="form-row"><label>Subject</label><select id="q-sub"></select></div>
    <div class="form-row"><label>Topic</label><select id="q-top"></select></div>
    <div class="form-row"><label>Question text</label><textarea id="q-text" rows="3">${q.text}</textarea></div>
    <div id="choices-area"></div>
    <div class="form-row"><label>Image (URL or base64)</label><input id="q-image" value="${q.image||''}" /></div>
    <div class="form-row"><button id="save-q" class="btn primary">${isNew?'Create':'Save'}</button></div>
  </div>`;
  // populate selects and choices
  const qsub = $('#q-sub'); DB.listSubjects().forEach(s=>{ const o=document.createElement('option'); o.value=s.id; o.textContent=s.name; if(s.id===q.subjectId) o.selected=true; qsub.appendChild(o); });
  const qtop = $('#q-top'); DB.listTopics().forEach(t=>{ const o=document.createElement('option'); o.value=t.id; o.textContent=t.name; if(t.id===q.topicId) o.selected=true; qtop.appendChild(o); });
  const choicesArea = $('#choices-area');
  q.choices.forEach((ch, i)=>{
    const id = uid('choice');
    const div = document.createElement('div'); div.className='form-row';
    div.innerHTML = `<label>Choice ${i+1}</label><input id="${id}" value="${ch}" /><label><input type="radio" name="correct" ${i===q.answerIndex? 'checked':''} data-idx="${i}" /> Correct</label>`;
    choicesArea.appendChild(div);
  });
  $('#save-q').addEventListener('click', ()=>{
    const subjectId = $('#q-sub').value;
    const topicId = $('#q-top').value;
    const text = $('#q-text').value.trim();
    const image = $('#q-image').value.trim();
    const choiceInputs = choicesArea.querySelectorAll('input[type="text"], input[type="input"]');
    const choices = Array.from(choicesArea.querySelectorAll('input[type="text"], input[type="search"], input[type="url"], input[type="text"]'))
      .map(inp => inp.value);
    // fallback if choices empty:
    const choicesEls = choicesArea.querySelectorAll('input[type="text"]');
    const finalChoices = Array.from(choicesEls).map(i=>i.value || '');
    const correctRadio = choicesArea.querySelector('input[name="correct"]:checked');
    const answerIdx = correctRadio ? Number(correctRadio.dataset.idx) : 0;
    const payload = { subjectId, topicId, text, choices: finalChoices, answerIndex: answerIdx, image };
    if(isNew){
      DB.addQuestion(payload);
    } else {
      DB.updateQuestion(questionId, payload);
    }
    openQuestions.click();
  });
}

/* Export / Import DB */
exportJsonBtn.addEventListener('click', ()=>{
  const json = DB.exportJSON();
  const blob = new Blob([json], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'quizlab_db.json'; a.click();
  URL.revokeObjectURL(url);
});
importJsonBtn.addEventListener('click', ()=>{
  const input = document.createElement('input'); input.type='file'; input.accept='application/json';
  input.addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const success = DB.importJSON(ev.target.result);
      if(success) alert('Import complete'); else alert('Import failed');
    };
    reader.readAsText(file);
  });
  input.click();
});
/* ---------- SECOND HALF: ADMIN ENHANCEMENTS ---------- */

/* CSV Import */
const csvInputButton = document.createElement('button');
csvInputButton.textContent = "Import CSV";
csvInputButton.className = "btn";
openQuestions.parentElement.appendChild(csvInputButton);

csvInputButton.addEventListener('click', ()=>{
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = '.csv';
  file.onchange = e =>{
    const f = e.target.files[0];
    if(!f) return;
    const rdr = new FileReader();
    rdr.onload = () => parseCSVImport(rdr.result);
    rdr.readAsText(f);
  };
  file.click();
});

function parseCSVImport(csv){
  const rows = csv.split(/\r?\n/).map(r => r.split(',').map(x=>x.replace(/^"|"$/g,'')));
  rows.shift(); // header
  rows.forEach(r=>{
    if(!r[3]) return; // no text
    const subjName = r[1];
    const topicName = r[2];
    let subj = DB.listSubjects().find(s=>s.name===subjName);
    if(!subj) subj = {id: DB.addSubject(subjName), name: subjName};
    let topic = DB.listTopics().find(t=>t.name===topicName);
    if(!topic) topic = {id: DB.addTopic(subj.id, topicName), name: topicName};

    DB.addQuestion({
      subjectId: subj.id,
      topicId: topic.id,
      text: r[3],
      choices: JSON.parse(r[4] || '[]'),
      answerIndex: Number(r[5]||0),
      image: r[6] || ''
    });
  });
  alert("Import complete");
  openQuestions.click();
}

/* Base64 Image Tool */
function uploadImageBase64(callback){
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.onchange = e =>{
    const f = e.target.files[0];
    if(!f) return;
    const rdr = new FileReader();
    rdr.onload = () => callback(rdr.result);
    rdr.readAsDataURL(f);
  };
  file.click();
}

/* Enhance Question Editor to include base64 button */
function enhanceImageField(){
  const btn = document.createElement('button');
  btn.textContent = "Upload Image (Base64)";
  btn.className = 'btn';
  const imgInput = $('#q-image');
  imgInput.parentNode.appendChild(btn);
  btn.addEventListener('click', ()=>{
    uploadImageBase64(data => {
      imgInput.value = data;
    });
  });
}

/* Run enhancement when question editor loads */
const observer = new MutationObserver(()=>{
  const img = document.querySelector('#q-image');
  if(img) enhanceImageField();
});
observer.observe(adminMain, {childList:true, subtree:true});

