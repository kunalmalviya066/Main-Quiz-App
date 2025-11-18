/* Core Logic for MockQuiz App */

/* ------------------- GLOBAL STATE ------------------- */
let currentView = "home";
let quizState = null; // active quiz data
let quizTimer = null;
let remainingSeconds = 0;
$1

let quizStartTimeStamp = 0; // used to ignore immediate visibility glitches after starting a quiz


/* ------------------- VIEW HANDLING ------------------- */
function showView(id) {
  if (quizState && id !== "quiz") {
    showBlockModal(
      "A quiz is currently active. You must finish, pause, or cancel it before navigating away.",
      [{ text: "OK", action: closeModal }]
    );
    return;
  }

  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(`view-${id}`).classList.remove("hidden");
  currentView = id;
}

/* ------------------- NAVIGATION BINDINGS ------------------- */
document.querySelectorAll("[data-nav]").forEach(btn => {
  btn.addEventListener("click", () => showView(btn.dataset.nav));
});

/* ------------------- POPULATE SUBJECTS ------------------- */
function loadSubjects() {
  const container = document.getElementById("subjects-list");
  container.innerHTML = "";
  QUIZ_DB.subjects.forEach(sub => {
    const btn = document.createElement("button");
    btn.textContent = sub.name;
    btn.addEventListener("click", () => selectSubject(sub));
    container.appendChild(btn);
  });
}

/* ------------------- SUBJECT FLOW ------------------- */
let selectedSubject = null;
let selectedTopics = new Set();

function selectSubject(sub) {
  selectedSubject = sub;
  selectedTopics.clear();

  document.getElementById("subject-topics").classList.remove("hidden");
  document.getElementById("selected-subject-name").textContent = sub.name;

  const topicsContainer = document.getElementById("topics-list");
  topicsContainer.innerHTML = "";

  sub.topics.forEach(topic => {
    const btn = document.createElement("button");
    btn.textContent = topic.name;
    btn.addEventListener("click", () => {
      if (selectedTopics.has(topic.id)) selectedTopics.delete(topic.id);
      else selectedTopics.add(topic.id);
      btn.classList.toggle("active");
    });
    topicsContainer.appendChild(btn);
  });
}

document.getElementById("subject-start").addEventListener("click", () => {
  if (!selectedSubject) return;
  if (selectedTopics.size === 0) {
    alert("Select at least one topic.");
    return;
  }

  const n = parseInt(document.getElementById("subject-numq").value);
  const t = parseInt(document.getElementById("subject-timemin").value) * 60;

  const questions = buildQuestionsFromTopics();
  startQuiz(questions, n, t, selectedSubject, [...selectedTopics]);
});

document.getElementById("subject-cancel").addEventListener("click", () => {
  document.getElementById("subject-topics").classList.add("hidden");
  selectedTopics.clear();
});

function buildQuestionsFromTopics() {
  let arr = [];
  selectedSubject.topics.forEach(t => {
    if (selectedTopics.has(t.id)) arr = arr.concat(t.questions);
  });
  return shuffle(arr);
}

/* ------------------- DAILY QUIZ ------------------- */
document.getElementById("daily-start").addEventListener("click", () => {
  const n = parseInt(document.getElementById("daily-numq").value);
  const t = parseInt(document.getElementById("daily-timemin").value) * 60;

  let all = [];
  QUIZ_DB.subjects.forEach(s => {
    s.topics.forEach(tp => all = all.concat(tp.questions));
  });

  startQuiz(all, n, t, { id: "daily", name: "Daily Quiz" }, []);
});

/* ------------------- FULL MOCK ------------------- */
function loadFullMockSubjects() {
  const container = document.getElementById("fullmock-subjects");
  container.innerHTML = "";

  QUIZ_DB.subjects.forEach(sub => {
    const btn = document.createElement("button");
    btn.textContent = sub.name;
    btn.addEventListener("click", () => chooseFullMockSubject(sub));
    container.appendChild(btn);
  });
}

let chosenMockSubject = null;

function chooseFullMockSubject(sub) {
  chosenMockSubject = sub;
  document.getElementById("fullmock-setup").classList.remove("hidden");
  document.getElementById("fullmock-subject-name").textContent = sub.name;
}

document.getElementById("fullmock-cancel").addEventListener("click", () => {
  chosenMockSubject = null;
  document.getElementById("fullmock-setup").classList.add("hidden");
});

document.getElementById("fullmock-start").addEventListener("click", () => {
  if (!chosenMockSubject) return;

  const n = parseInt(document.getElementById("fullmock-numq").value);
  const t = parseInt(document.getElementById("fullmock-timemin").value) * 60;

  let arr = [];
  chosenMockSubject.topics.forEach(tp => arr = arr.concat(tp.questions));

  startQuiz(arr, n, t, chosenMockSubject, []);
});

/* ------------------- QUIZ ENGINE ------------------- */
function startQuiz(pool, count, seconds, subject, topics) {
  const selected = shuffle(pool).slice(0, count);

  quizState = {
    subject,
    topics,
    questions: selected,
    currentIndex: 0,
    answers: Array(selected.length).fill(null),
    marked: new Set(),
    startTime: Date.now(),
    timeAllowed: seconds
  };

  $1
  quizStartTimeStamp = Date.now();

  renderQuiz();
  showView("quiz");
  startTimer();
}

/* RENDER QUIZ UI */
function renderQuiz() {
  const q = quizState.questions[quizState.currentIndex];

  document.getElementById("quiz-title").textContent = quizState.subject.name;
  document.getElementById("quiz-subtitle").textContent = `Question ${quizState.currentIndex + 1}/${quizState.questions.length}`;

  const area = document.getElementById("question-area");
  area.innerHTML = "";

  const qText = document.createElement("div");
  qText.textContent = q.text;
  area.appendChild(qText);

  if (q.image) {
    const img = document.createElement("img");
    img.src = q.image;
    img.className = "q-img";
    area.appendChild(img);
  }

  q.options.forEach((opt, idx) => {
    const lbl = document.createElement("label");
    const r = document.createElement("input");
    r.type = "radio";
    r.name = "qopt";
    r.value = idx;
    if (quizState.answers[quizState.currentIndex] === idx) r.checked = true;
    r.addEventListener("change", () => quizState.answers[quizState.currentIndex] = idx);
    lbl.appendChild(r);
    lbl.appendChild(document.createTextNode(opt));
    area.appendChild(lbl);
    area.appendChild(document.createElement("br"));
  });

  renderNavigator();
}

/* NAVIGATOR */
function renderNavigator() {
  const nav = document.getElementById("navigator-grid");
  nav.innerHTML = "";

  quizState.questions.forEach((_, i) => {
    const btn = document.createElement("button");
    btn.textContent = i + 1;

    if (i === quizState.currentIndex) btn.classList.add("current");
    if (quizState.answers[i] !== null) btn.classList.add("answered");
    if (quizState.marked.has(i)) btn.classList.add("marked");

    btn.addEventListener("click", () => {
      quizState.currentIndex = i;
      renderQuiz();
    });

    nav.appendChild(btn);
  });
}

/* ACTION BUTTONS */
document.getElementById("prev-q").onclick = () => {
  if (quizState.currentIndex > 0) {
    quizState.currentIndex--;
    renderQuiz();
  }
};

document.getElementById("next-q").onclick = () => {
  if (quizState.currentIndex < quizState.questions.length - 1) {
    quizState.currentIndex++;
    renderQuiz();
  }
};

document.getElementById("mark-review").onclick = () => {
  const i = quizState.currentIndex;
  if (quizState.marked.has(i)) quizState.marked.delete(i);
  else quizState.marked.add(i);
  renderNavigator();
};

/* CLEAR ANSWER */
document.getElementById("clear-answer").onclick = () => {
  quizState.answers[quizState.currentIndex] = null;
  renderQuiz();
};

/* FINISH */
document.getElementById("finish-quiz").onclick = () => {
  showBlockModal("Submit quiz?", [
    { text: "Cancel", action: closeModal },
    { text: "Submit", action: submitQuiz }
  ]);
};

/* ------------------- TIMER ------------------- */
function startTimer() {
  clearInterval(quizTimer);
  quizTimer = setInterval(() => {
    remainingSeconds--;
    updateTimer();
    if (remainingSeconds <= 0) submitQuiz();
  }, 1000);
}

function updateTimer() {
  const mm = Math.floor(remainingSeconds / 60).toString().padStart(2, "0");
  const ss = (remainingSeconds % 60).toString().padStart(2, "0");
  document.getElementById("timer-display").textContent = `${mm}:${ss}`;
}

/* PAUSE/RESUME */
document.getElementById("timer-pause").onclick = () => pauseQuiz();
document.getElementById("timer-resume").onclick = () => resumeQuiz();
document.getElementById("overlay-resume").onclick = () => resumeQuiz();

function pauseQuiz() {
  clearInterval(quizTimer);
  document.getElementById("pause-overlay").classList.remove("hidden");
  document.getElementById("timer-pause").classList.add("hidden");
  document.getElementById("timer-resume").classList.remove("hidden");
}

function resumeQuiz() {
  document.getElementById("pause-overlay").classList.add("hidden");
  document.getElementById("timer-pause").classList.remove("hidden");
  document.getElementById("timer-resume").classList.add("hidden");
  startTimer();
}

/* TAB SWITCH AUTO-PAUSE */
document.addEventListener("visibilitychange", () => {
  if (!quizState) return;
  // Ignore visibility change events that happen immediately after starting a quiz
  if (Date.now() - quizStartTimeStamp < 1000) return;

  if (document.hidden) pauseQuiz();
});

/* ------------------- SUBMIT & RESULTS ------------------- */
function submitQuiz() {
  clearInterval(quizTimer);

  const q = quizState.questions;
  const ans = quizState.answers;

  let correct = 0;
  let attempted = 0;

  q.forEach((item, i) => {
    if (ans[i] !== null) attempted++;
    if (ans[i] === item.answer) correct++;
  });

  const unattempted = q.length - attempted;
  const accuracy = attempted ? (correct / attempted) * 100 : 0;

  const result = {
    id: Date.now(),
    subject: quizState.subject.name,
    topics: quizState.topics,
    total: q.length,
    correct,
    attempted,
    unattempted,
    accuracy,
    timeTaken: quizState.timeAllowed - remainingSeconds,
    questions: q.map((it, i) => ({
      text: it.text,
      options: it.options,
      correct: it.answer,
      user: ans[i],
      explanation: it.explanation
    }))
  };

  history.push(result);
  localStorage.setItem("mockquiz_history", JSON.stringify(history));

  quizState = null;
  showHistory();
  showView("results");
  closeModal();
}

/* ------------------- HISTORY VIEW ------------------- */
function showHistory() {
  const container = document.getElementById("history-list");
  container.innerHTML = "";

  history.forEach(item => {
    const card = document.createElement("div");
    card.className = "history-card";

    card.innerHTML = `
      <strong>${item.subject}</strong><br>
      Score: ${item.correct}/${item.total}<br>
      Accuracy: ${item.accuracy.toFixed(1)}%<br>
      Time: ${Math.floor(item.timeTaken/60)}m
      <br><br>
    `;

    const viewBtn = document.createElement("button");
    viewBtn.textContent = "View Details";
    viewBtn.onclick = () => showResultDetail(item);

    const delBtn = document.createElement("button");
    delBtn.textContent = "Delete";
    delBtn.onclick = () => deleteHistory(item.id);

    card.appendChild(viewBtn);
    card.appendChild(delBtn);
    container.appendChild(card);
  });
}

function deleteHistory(id) {
  history = history.filter(h => h.id !== id);
  localStorage.setItem("mockquiz_history", JSON.stringify(history));
  showHistory();
}

document.getElementById("clear-history").onclick = () => {
  if (confirm("Clear all history?")) {
    history = [];
    localStorage.setItem("mockquiz_history", "[]");
    showHistory();
  }
};

/* DETAILED RESULT */
function showResultDetail(item) {
  const detail = document.getElementById("result-detail");
  detail.classList.remove("hidden");

  let html = `<h3>${item.subject}</h3>`;
  html += `<p>Score: ${item.correct}/${item.total}</p>`;
  html += `<p>Accuracy: ${item.accuracy.toFixed(2)}%</p>`;

  item.questions.forEach((q, i) => {
    html += `<div class='q-review'>`;
    html += `<strong>Q${i+1}:</strong> ${q.text}<br>`;
    q.options.forEach((op, idx) => {
      let mark = "";
      if (idx === q.correct) mark = "✔";
      if (idx === q.user && q.user !== q.correct) mark = "✖";
      html += `${idx+1}. ${op} ${mark}<br>`;
    });
    html += `<em>Explanation:</em> ${q.explanation}<br><br>`;
    html += `</div>`;
  });

  detail.innerHTML = html;
}

/* ------------------- MODAL ------------------- */
function showBlockModal(msg, buttons) {
  const root = document.getElementById("modal-root");
  root.innerHTML = "";

  const box = document.createElement("div");
  box.className = "overlay";

  let inner = `<div class='overlay-content'><p>${msg}</p>`;
  buttons.forEach(b => {
    inner += `<button class='modal-btn'>${b.text}</button>`;
  });
  inner += `</div>`;

  box.innerHTML = inner;
  root.appendChild(box);

  const btns = root.querySelectorAll("button.modal-btn");
  btns.forEach((btn, i) => {
    btn.onclick = () => buttons[i].action();
  });
}
function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
}

/* ------------------- UTIL ------------------- */
function shuffle(arr) {
  return arr.slice().sort(() => Math.random() - 0.5);
}

/* INIT */
loadSubjects();
loadFullMockSubjects();
showHistory();
