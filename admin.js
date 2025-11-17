/* admin.js */
(function(){
  // elements
  const loginCard = document.getElementById('login-card');
  const adminArea = document.getElementById('admin-area');
  const importExport = document.getElementById('import-export');
  const quickAdd = document.getElementById('quick-add');

  const adminUserEl = document.getElementById('admin-user');
  const adminPwEl = document.getElementById('admin-pw');
  const adminLoginBtn = document.getElementById('admin-login');
  const loginMsg = document.getElementById('login-msg');

  const backHome = document.getElementById('back-home');
  const exportJsonBtn = document.getElementById('export-json');
  const exportCsvBtn = document.getElementById('export-csv');
  const importJsonFile = document.getElementById('import-json-file');
  const importCsvFile = document.getElementById('import-csv-file');

  const subjectsAdmin = document.getElementById('subjects-admin');
  const topicsAdmin = document.getElementById('topics-admin');
  const questionsAdmin = document.getElementById('questions-admin');
  const historyAdmin = document.getElementById('history-admin');

  const newSubjectBtn = document.getElementById('new-subject');
  const newTopicBtn = document.getElementById('new-topic');
  const newQuestionBtn = document.getElementById('new-question');

  const qaSubject = document.getElementById('qa-subject');
  const qaTopic = document.getElementById('qa-topic');
  const qaText = document.getElementById('qa-text');
  const qaChoices = document.getElementById('qa-choices');
  const qaAnswer = document.getElementById('qa-answer');
  const qaImage = document.getElementById('qa-image');
  const qaAddBtn = document.getElementById('qa-add');
  const qaMsg = document.getElementById('qa-msg');

  // simple auth flow
  adminLoginBtn.onclick = ()=>{
    const user = adminUserEl.value.trim(), pw = adminPwEl.value;
    if(DB.adminLogin(user, pw)){
      loginSuccess();
    } else {
      loginMsg.textContent = 'Invalid credentials';
    }
  };

  backHome.onclick = ()=> location.href = 'index.html';

  function loginSuccess(){
    loginCard.style.display = 'none';
    adminArea.style.display = '';
    importExport.style.display = '';
    quickAdd.style.display = '';
    renderAll();
  }

  function renderAll(){
    renderSubjects();
    renderTopics();
    renderQuestions();
    renderHistory();
  }

  function renderSubjects(){
    const subs = DB.getSubjects();
    subjectsAdmin.innerHTML = subs.map(s=>`
      <div class="card" style="padding:8px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${s.name}</strong><div class="muted small">${s.description||''}</div></div>
          <div>
            <button class="btn subtle edit-sub" data-id="${s.id}">Edit</button>
            <button class="btn danger del-sub" data-id="${s.id}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
    subjectsAdmin.querySelectorAll('.edit-sub').forEach(btn=>{
      btn.onclick = ()=> editSubject(btn.dataset.id);
    });
    subjectsAdmin.querySelectorAll('.del-sub').forEach(btn=>{
      btn.onclick = ()=> { if(confirm('Delete subject and related data?')) { DB.removeSubject(btn.dataset.id); renderAll(); } };
    });
  }

  function renderTopics(){
    const topics = DB.getTopics();
    topicsAdmin.innerHTML = topics.map(t=>{
      const subj = DB.getSubjects().find(s=>s.id===t.subjectId);
      return `<div class="card" style="padding:8px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${t.name}</strong><div class="muted small">${subj ? subj.name : ''}</div></div>
          <div>
            <button class="btn subtle edit-top" data-id="${t.id}">Edit</button>
            <button class="btn danger del-top" data-id="${t.id}">Delete</button>
          </div>
        </div>
      </div>`;
    }).join('');
    topicsAdmin.querySelectorAll('.edit-top').forEach(btn=>{
      btn.onclick = ()=> editTopic(btn.dataset.id);
    });
    topicsAdmin.querySelectorAll('.del-top').forEach(btn=>{
      btn.onclick = ()=> { if(confirm('Delete topic and related questions?')) { DB.removeTopic(btn.dataset.id); renderAll(); } };
    });
  }

  function renderQuestions(){
    const qs = DB.getQuestions();
    questionsAdmin.innerHTML = qs.map(q=>`
      <div style="padding:8px;border-bottom:1px solid #f1f5f9">
        <div style="display:flex;justify-content:space-between">
          <div>
            <div><strong>${q.text.slice(0,80)}</strong></div>
            <div class="muted small">${q.choices.map(c=>c.text).join(' | ')}</div>
          </div>
          <div>
            <button class="btn subtle edit-q" data-id="${q.id}">Edit</button>
            <button class="btn danger del-q" data-id="${q.id}">Delete</button>
          </div>
        </div>
      </div>
    `).join('');
    questionsAdmin.querySelectorAll('.edit-q').forEach(btn=> btn.onclick = ()=> editQuestion(btn.dataset.id));
    questionsAdmin.querySelectorAll('.del-q').forEach(btn=> btn.onclick = ()=> { if(confirm('Delete question?')) { DB.removeQuestion(btn.dataset.id); renderAll(); }});
  }

  function renderHistory(){
    const h = DB.getHistory();
    historyAdmin.innerHTML = h.map(item=>`<div class="muted small">${new Date(item.timestamp).toLocaleString()} • ${item.title} • ${item.meta.percent}%</div>`).join('');
  }

  // edit/create handlers
  newSubjectBtn.onclick = ()=> {
    const name = prompt('Subject name');
    if(!name) return;
    DB.addSubject({ name, description: '' });
    renderAll();
  };

  newTopicBtn.onclick = ()=> {
    const subs = DB.getSubjects();
    const subId = subs.length ? subs[0].id : null;
    const name = prompt('Topic name');
    if(!name) return;
    DB.addTopic({ name, subjectId: subId, description: ''});
    renderAll();
  };

  newQuestionBtn.onclick = ()=> createQuestionForm();

  function editSubject(id){
    const s = DB.getSubjects().find(x=>x.id===id);
    const name = prompt('Subject name', s.name);
    if(!name) return;
    DB.updateSubject(id, { name });
    renderAll();
  }

  function editTopic(id){
    const t = DB.getTopics().find(x=>x.id===id);
    const name = prompt('Topic name', t.name);
    if(!name) return;
    DB.updateTopic(id, { name });
    renderAll();
  }

  function editQuestion(id){
    const q = DB.getQuestionById(id);
    createQuestionForm(q);
  }

  function createQuestionForm(existing){
    // simple form modal using prompt for speed
    const subjects = DB.getSubjects();
    const topics = DB.getTopics();
    const subject = existing ? existing.subjectId : (subjects[0] && subjects[0].id);
    let topic = existing ? existing.topicId : (topics[0] && topics[0].id);
    const text = prompt('Question text', existing ? existing.text : '');
    if(!text) return;
    const choicesText = prompt('Choices (pipe-separated)', existing ? existing.choices.map(c=>c.text).join('|') : 'Option1|Option2|Option3|Option4');
    const answers = prompt('Correct answer index (1-based, comma separated for multi)', existing ? existing.answerIds.map((_,i)=>i+1).join(',') : '1');
    const img = prompt('Image URL or leave blank', existing ? existing.imageUrl : '');
    // assemble
    const choiceArr = (choicesText||'').split('|').map((t,i)=>({ id: 'c_'+i, text: t }));
    const answerIdxs = (answers||'').split(',').map(x=>parseInt(x,10)-1).filter(n=>!isNaN(n));
    const answerIds = answerIdxs.map(i => choiceArr[i] ? choiceArr[i].id : null).filter(Boolean);
    const qObj = {
      id: existing ? existing.id : undefined,
      topicId: topic || topics[0].id,
      subjectId: subject || subjects[0].id,
      text,
      choices: choiceArr,
      answerIds,
      imageUrl: img,
      tags: [],
      difficulty: 'medium'
    };
    if(existing) DB.updateQuestion(existing.id, qObj); else DB.addQuestion(qObj);
    renderAll();
  }

  // quick-add with image reading base64
  qaAddBtn.onclick = async ()=>{
    const subjName = qaSubject.value.trim();
    const topicName = qaTopic.value.trim();
    let subj = DB.getSubjects().find(s=>s.name === subjName);
    if(!subj){
      subj = DB.addSubject({ name: subjName, description: ''});
    }
    let top = DB.getTopics().find(t=>t.name === topicName && t.subjectId === subj.id);
    if(!top){
      top = DB.addTopic({ name: topicName, subjectId: subj.id, description: ''});
    }
    const text = qaText.value.trim();
    const choices = qaChoices.value.trim().split('\n').map(s=>s.trim()).filter(Boolean);
    const answerIdx = qaAnswer.value.trim().split(',').map(x=>parseInt(x,10)-1).filter(n=>!isNaN(n));
    let imageUrl = '';
    if(qaImage.files && qaImage.files[0]){
      imageUrl = await fileToBase64(qaImage.files[0]);
    }
    const choiceObjs = choices.map((c,i)=>({ id: 'c_' + i + '_' + Date.now(), text: c }));
    const answerIds = answerIdx.map(i=>choiceObjs[i] && choiceObjs[i].id).filter(Boolean);
    const q = {
      topicId: top.id,
      subjectId: subj.id,
      text,
      choices: choiceObjs,
      answerIds,
      imageUrl,
      tags: [],
      difficulty: 'medium'
    };
    DB.addQuestion(q);
    qaMsg.textContent = 'Question added';
    qaText.value = ''; qaChoices.value=''; qaAnswer.value=''; qaImage.value='';
    renderAll();
  };

  function fileToBase64(file){
    return new Promise((res,rej)=>{
      const reader = new FileReader();
      reader.onload = ()=>res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  // import/export
  exportJsonBtn.onclick = ()=>{
    const data = DB.exportJSON();
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'quiz_db_export.json'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  exportCsvBtn.onclick = ()=>{
    const csv = DB.exportCSV();
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'questions_export.csv'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  importJsonFile.onchange = function(e){
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=> {
      const ok = DB.importJSON(reader.result);
      alert(ok ? 'Imported JSON' : 'Import failed');
      renderAll();
    };
    reader.readAsText(f);
  };

  importCsvFile.onchange = function(e){
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=> {
      try{
        DB.importCSV(reader.result);
        alert('CSV imported');
        renderAll();
      }catch(err){ alert('CSV import failed'); }
    };
    reader.readAsText(f);
  };

  // initial render (if admin auto-login not required)
  // If you want to auto-enter admin (local dev), you can call loginSuccess() here.
})();
