/* ============================================================
   script.js — Public Quiz Engine for QuizMaster
   ============================================================

   Notes:
   - This file assumes helper functions from utils.js and db.js are available.
     If you are using ES modules, replace the GLOBAL_LOOKUP block with:
       import { $, $all, createEl, shuffleArray, fileToBase64, parseCSV, generateCSV,
                downloadFile, formatTime, todayString, randomId, safeGet, safeSet }
              from './utils.js';
       import { getSubjects, getTopics, getQuestions, addTestHistory, setDailyQuiz, getDailyQuiz }
              from './db.js';

   - The code below uses a graceful global lookup: it will attempt to use named globals
     (e.g., window.getSubjects) if present; otherwise it will expect the functions to exist
     in the current scope.

   ============================================================ */

(function () {

    /* ---------------------------
       GLOBAL LOOKUP / SHIMS
       --------------------------- */
    const GLOBAL = (typeof window !== "undefined") ? window : self;

    // List of helper names we use
    const HELPERS = [
        "$", "$all", "createEl",
        "shuffleArray", "randomId", "formatTime", "todayString",
        "fileToBase64", "parseCSV", "generateCSV", "downloadFile",
        "safeGet", "safeSet"
    ];

    // Map to local names (attempt global lookup)
    const helpers = {};
    HELPERS.forEach(name => {
        if (typeof GLOBAL[name] === "function") helpers[name] = GLOBAL[name];
    });

    // db functions expected
    const DB_FUNCS = [
        "getSubjects", "getTopics", "getQuestions",
        "addTestHistory", "setDailyQuiz", "getDailyQuiz"
    ];
    const db = {};
    DB_FUNCS.forEach(name => {
        if (typeof GLOBAL[name] === "function") db[name] = GLOBAL[name];
    });

    // simple fail-safe
    function requireFunctions(list, containerName) {
        const missing = list.filter(n => !(helpers[n] || db[n]));
        if (missing.length) {
            console.warn("script.js: missing helpers or db functions, some features may not work:", missing);
        }
    }
    requireFunctions([...HELPERS, ...DB_FUNCS], "required");

    // local references (fallback to window functions if available)
    const $ = helpers["$"] || ((s, p=document) => p.querySelector(s));
    const $all = helpers["$all"] || ((s, p=document) => Array.from(p.querySelectorAll(s)));
    const createEl = helpers["createEl"] || ((t,c,h)=>{const e=document.createElement(t);if(c)e.className=c;if(h)e.innerHTML=h;return e;});
    const shuffleArray = helpers["shuffleArray"] || (a=>a.sort(()=>Math.random()-0.5));
    const randomId = helpers["randomId"] || (p=>"id_"+Math.random().toString(36).slice(2,9));
    const formatTime = helpers["formatTime"] || (s=>{s=Math.floor(s); const m=Math.floor(s/60); const r=s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;});
    const todayString = helpers["todayString"] || (()=>{const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;});

    const getSubjects = db["getSubjects"] || (()=>[]);
    const getTopics = db["getTopics"] || (()=>[]);
    const getQuestions = db["getQuestions"] || (()=>[]);
    const addTestHistory = db["addTestHistory"] || (()=>{console.warn("addTestHistory missing");});
    const setDailyQuiz = db["setDailyQuiz"] || (()=>{console.warn("setDailyQuiz missing");});
    const getDailyQuiz = db["getDailyQuiz"] || (()=>({lastDate:null,testId:null}));

    /* ---------------------------
       STATE
       --------------------------- */
    let currentTest = null; // object holding test state while running
    let timerInterval = null;

    // violation tracking for anti-cheat during an active test
    let visibilityViolations = 0;

    /* ---------------------------
       SELECTORS
       --------------------------- */
    const subjectListEl = $("#subjectList");
    const topicSubjectListEl = $("#topicSubjectList");
    const topicListEl = $("#topicList");
    const startDailyQuizBtn = $("#startDailyQuizBtn");
    const dailyQuizStatusEl = $("#dailyQuizStatus");
    const appView = document.getElementById("appView");

    /* ---------------------------
       INITIAL RENDER
       --------------------------- */
    function init() {
        renderSubjects();
        renderTopicSubjectList();
        attachDailyQuizStatus();
        bindGlobalAntiCheat();
    }

    /* ============================================================
       RENDER SUBJECTS (HOME -> Subjects)
       ============================================================ */
    function renderSubjects() {
        const subjects = getSubjects();
        if (!subjectListEl) return;

        if (!subjects.length) {
            subjectListEl.innerHTML = `<p>No subjects available. Use Admin to add subjects.</p>`;
            return;
        }

        subjectListEl.innerHTML = "";
        subjects.forEach(s => {
            const card = createEl("div", "item-card");
            card.innerHTML = `<h4>${s.name}</h4><p>${s.description || ""}</p>
                <div style="margin-top:10px">
                    <button class="btn-primary startSubject" data-id="${s.id}">Start Subject Test</button>
                    <button class="btn-secondary topicwise" data-id="${s.id}">Topics</button>
                </div>`;
            subjectListEl.appendChild(card);
        });

        // bind
        $all(".startSubject").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const subjectId = btn.dataset.id;
                openStartTestModal({ subjectId });
            });
        });

        $all(".topicwise").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const subjectId = btn.dataset.id;
                // navigate to topicwise page and auto-select subject
                location.hash = "topicwise";
                // small delay to let route show
                setTimeout(()=> {
                    renderTopicsForSubject(subjectId);
                    smoothScrollTo($("#topicList"));
                }, 200);
            });
        });
    }

    /* ============================================================
       TOPIC-WISE LIST
       ============================================================ */
    function renderTopicSubjectList() {
        const subjects = getSubjects();
        if (!topicSubjectListEl) return;

        topicSubjectListEl.innerHTML = "";
        subjects.forEach(s => {
            const card = createEl("div", "item-card");
            card.innerHTML = `<h4>${s.name}</h4><p>${s.description || ""}</p>
            <div style="margin-top:10px">
                <button class="btn-primary topicOpen" data-id="${s.id}">Open Topics</button>
            </div>`;
            topicSubjectListEl.appendChild(card);
        });

        $all(".topicOpen").forEach(btn => {
            btn.addEventListener("click", () => {
                const subjectId = btn.dataset.id;
                renderTopicsForSubject(subjectId);
                smoothScrollTo($("#topicList"));
            });
        });
    }

    function renderTopicsForSubject(subjectId) {
        const topics = getTopics(subjectId);
        if (!topicListEl) return;

        if (!topics.length) {
            topicListEl.innerHTML = "<p>No topics for this subject.</p>";
            return;
        }

        topicListEl.innerHTML = "";
        topics.forEach(t => {
            const card = createEl("div", "item-card");
            card.innerHTML = `<h4>${t.name}</h4>
                <div style="margin-top:10px">
                    <button class="btn-primary startTopicTest" data-sub="${t.subjectId}" data-topic="${t.id}">Start Topic Test</button>
                </div>`;
            topicListEl.appendChild(card);
        });

        $all(".startTopicTest").forEach(btn => {
            btn.addEventListener("click", () => {
                const subjectId = btn.dataset.sub;
                const topicId = btn.dataset.topic;
                openStartTestModal({ subjectId, topicId });
            });
        });
    }

    /* ============================================================
       START TEST MODAL (simple in-DOM modal)
       Options: numberOfQuestions, timerMode (none/per-question/total), perQuestionSeconds, totalSeconds, shuffleChoices, fullscreen
       ============================================================ */
    function openStartTestModal({ subjectId=null, topicId=null } = {}) {
        // build modal
        const modal = createEl("div", "quiz-modal");
        modal.style.position = "fixed";
        modal.style.left = 0;
        modal.style.top = 0;
        modal.style.width = "100%";
        modal.style.height = "100%";
        modal.style.background = "rgba(0,0,0,0.4)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = 9999;

        const box = createEl("div");
        box.style.width = "420px";
        box.style.background = "#fff";
        box.style.padding = "20px";
        box.style.borderRadius = "8px";

        const html = `
            <h3>Start Test</h3>
            <p>Configure test options below.</p>

            <div style="margin-top:10px;">
                <label>Number of Questions</label>
                <input id="optCount" type="number" min="1" max="200" value="10" style="width:100%;padding:8px;margin-top:6px;">
            </div>

            <div style="margin-top:10px;">
                <label>Timer Mode</label>
                <select id="optTimerMode" style="width:100%;padding:8px;margin-top:6px;">
                    <option value="off">Off</option>
                    <option value="per">Per-question</option>
                    <option value="total">Total timer</option>
                </select>
            </div>

            <div style="margin-top:10px; display:flex; gap:10px;">
                <div style="flex:1;">
                    <label>Per-question (secs)</label>
                    <input id="optPerSec" type="number" min="5" max="3600" value="30" style="width:100%;padding:8px;margin-top:6px;">
                </div>
                <div style="flex:1;">
                    <label>Total (secs)</label>
                    <input id="optTotalSec" type="number" min="30" max="72000" value="600" style="width:100%;padding:8px;margin-top:6px;">
                </div>
            </div>

            <div style="margin-top:10px; display:flex; gap:10px;">
                <label><input type="checkbox" id="optShuffle"> Shuffle choices</label>
                <label><input type="checkbox" id="optFull"> Fullscreen</label>
            </div>

            <div style="margin-top:12px; text-align:right;">
                <button id="cancelStart" class="btn-secondary">Cancel</button>
                <button id="confirmStart" class="btn-primary">Start</button>
            </div>
        `;
        box.innerHTML = html;
        modal.appendChild(box);
        document.body.appendChild(modal);

        // event bindings
        $("#cancelStart", modal).addEventListener("click", () => modal.remove());

        $("#confirmStart", modal).addEventListener("click", () => {
            const count = Number($("#optCount", modal).value) || 10;
            const timerMode = $("#optTimerMode", modal).value;
            const perSec = Number($("#optPerSec", modal).value) || 30;
            const totalSec = Number($("#optTotalSec", modal).value) || 600;
            const shuffle = !!$("#optShuffle", modal).checked;
            const fullscreen = !!$("#optFull", modal).checked;

            startTest({
                subjectId, topicId, count,
                timerMode, perSec, totalSec, shuffle, fullscreen
            });

            modal.remove();
        });

    }

    /* ============================================================
       START TEST: Prepare questions & open quiz UI
       ============================================================ */
    function startTest(options) {
        // options: subjectId, topicId, count, timerMode, perSec, totalSec, shuffle, fullscreen
        const { subjectId, topicId } = options;

        // fetch questions matching filters
        let pool = getQuestions({ subjectId, topicId });

        if (!pool || !pool.length) {
            alert("No questions available for this selection.");
            return;
        }

        // shuffle pool and pick requested count
        pool = shuffleArray(pool);
        const chosen = pool.slice(0, options.count);

        // build test state
        currentTest = {
            id: randomId("test"),
            subjectId: subjectId || null,
            topicId: topicId || null,
            options,
            questions: chosen.map(q => ({
                id: q.id,
                prompt: q.questionText,
                choices: Object.entries(q.choices).map(([k,v]) => ({ key:k, text:v })),
                correct: q.correctChoice,
                image: q.imageBase64 || "",
                timeSpent: 0,
                selected: null,
                marked: false
            })),
            startedAt: Date.now(),
            paused: false,
            elapsed: 0,
            totalTimeLeft: options.timerMode === "total" ? options.totalSec : null,
            perQuestionTimeLeft: options.timerMode === "per" ? options.perSec : null,
            currentIndex: 0,
            violations: 0
        };

        // optionally go fullscreen
        if (options.fullscreen && document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(()=>{/*ignore*/});
        }

        // show quiz UI
        openQuizUI();
        startTimers();
    }

    /* ============================================================
       QUIZ UI (rendering & interactions)
       ============================================================ */
    function openQuizUI() {
        // create a full screen overlay container for quiz
        const existing = $("#quizContainer");
        if (existing) existing.remove();

        const container = createEl("div");
        container.id = "quizContainer";
        container.style.position = "fixed";
        container.style.inset = "0";
        container.style.background = "#fff";
        container.style.zIndex = 9999;
        container.style.display = "flex";
        container.style.flexDirection = "column";

        // header with timer and controls
        const header = createEl("div", "quiz-header");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.style.padding = "12px 18px";
        header.style.borderBottom = "1px solid #eee";

        const left = createEl("div");
        left.innerHTML = `<strong>Quiz</strong> • ${currentTest.questions.length} questions`;

        const right = createEl("div");
        right.innerHTML = `
            <span id="totalTimer">--:--</span>
            <button id="pauseResumeBtn" class="btn-secondary" style="margin-left:12px">Pause</button>
            <button id="endTestBtn" class="btn-primary" style="margin-left:8px">Submit</button>
        `;

        header.appendChild(left);
        header.appendChild(right);

        // main content area: question + options + navigator
        const main = createEl("div", "quiz-main");
        main.style.display = "flex";
        main.style.flex = "1";

        const qPane = createEl("div", "quiz-question");
        qPane.style.flex = "1";
        qPane.style.padding = "20px";
        qPane.style.overflowY = "auto";

        const navPane = createEl("div", "quiz-nav");
        navPane.style.width = "260px";
        navPane.style.borderLeft = "1px solid #eee";
        navPane.style.padding = "18px";
        navPane.style.overflowY = "auto";

        main.appendChild(qPane);
        main.appendChild(navPane);

        container.appendChild(header);
        container.appendChild(main);

        document.body.appendChild(container);

        // render question area & navigator
        renderQuestionArea();
        renderNavigator();

        // bind controls
        $("#pauseResumeBtn").addEventListener("click", togglePause);
        $("#endTestBtn").addEventListener("click", confirmEndTest);

        // anti-cheat: block copy/paste and right-click inside quiz area
        container.addEventListener("contextmenu", e => e.preventDefault());
        container.addEventListener("copy", e => e.preventDefault());
        container.addEventListener("cut", e => e.preventDefault());
        container.addEventListener("paste", e => e.preventDefault());

        // keyboard navigation
        window.addEventListener("keydown", handleQuizKeydown);
    }

    function renderQuestionArea() {
        const qPane = $(".quiz-question");
        if (!qPane) return;

        const qi = currentTest.currentIndex;
        const q = currentTest.questions[qi];

        const qHtml = createEl("div");
        qHtml.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <h3>Q.${qi+1}</h3>
                <div>
                    <button id="markBtn" class="btn-secondary">${q.marked ? "Unmark" : "Mark"}</button>
                </div>
            </div>

            <div style="margin-top:10px;">
                <div style="font-size:16px;margin-bottom:10px;">${q.prompt}</div>
                ${q.image ? `<div style="margin:10px 0;"><img src="${q.image}" alt="question image" style="max-width:100%;border:1px solid #eee;padding:6px;border-radius:6px;"></div>` : ""}
            </div>

            <div id="choicesArea" style="margin-top:12px;"></div>

            <div style="margin-top:18px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <button id="prevQ" class="btn-secondary">Previous</button>
                    <button id="nextQ" class="btn-primary" style="margin-left:8px">Next</button>
                </div>

                <div>
                    <span id="perQTimer">--</span>
                </div>
            </div>
        `;

        qPane.innerHTML = "";
        qPane.appendChild(qHtml);

        // render choices (shuffle if option)
        let choices = q.choices.slice();
        if (currentTest.options.shuffle) choices = shuffleArray(choices);

        const choicesArea = $("#choicesArea");
        choices.forEach(c => {
            const id = randomId("ch");
            const wrap = createEl("div", "choice");
            wrap.style.padding = "10px";
            wrap.style.border = "1px solid #ddd";
            wrap.style.borderRadius = "6px";
            wrap.style.marginBottom = "8px";
            wrap.style.cursor = "pointer";
            wrap.setAttribute("data-key", c.key);

            wrap.innerHTML = `<strong>${c.key}.</strong> <span>${c.text}</span>`;

            if (q.selected === c.key) {
                wrap.style.background = "#e6f0ff";
                wrap.style.borderColor = "#007bff";
            }

            wrap.addEventListener("click", () => {
                // select
                q.selected = c.key;
                // reset per-question timer for next question? we keep it
                // visually update choices
                $all("#choicesArea .choice").forEach(el => {
                    el.style.background = "";
                    el.style.borderColor = "#ddd";
                });
                wrap.style.background = "#e6f0ff";
                wrap.style.borderColor = "#007bff";
            });

            choicesArea.appendChild(wrap);
        });

        // prev/next bindings
        $("#prevQ").addEventListener("click", () => {
            saveCurrentQuestionTime(); // ensure time tracked
            goToQuestion(currentTest.currentIndex - 1);
        });
        $("#nextQ").addEventListener("click", () => {
            saveCurrentQuestionTime();
            goToQuestion(currentTest.currentIndex + 1);
        });

        // mark
        $("#markBtn").addEventListener("click", () => {
            q.marked = !q.marked;
            renderNavigator();
            renderQuestionArea();
        });

    }

    function renderNavigator() {
        const navPane = $(".quiz-nav");
        if (!navPane) return;

        navPane.innerHTML = `<h4>Navigator</h4>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px" id="navButtons"></div>
            <div style="margin-top:16px;">
                <button id="submitSmall" class="btn-primary">Submit Test</button>
            </div>`;

        const navButtons = $("#navButtons");
        currentTest.questions.forEach((q, idx) => {
            const b = createEl("button");
            b.textContent = idx + 1;
            b.style.width = "44px";
            b.style.height = "44px";
            b.style.borderRadius = "6px";
            b.style.border = "1px solid #ddd";
            b.style.cursor = "pointer";
            b.dataset.index = idx;

            if (q.selected) {
                b.style.background = "#e6f0ff";
                b.style.borderColor = "#007bff";
            }
            if (q.marked) {
                b.style.outline = "3px solid #ffeb99";
            }
            if (idx === currentTest.currentIndex) {
                b.style.boxShadow = "inset 0 0 0 3px rgba(0,123,255,0.12)";
            }

            b.addEventListener("click", () => {
                saveCurrentQuestionTime();
                goToQuestion(idx);
            });

            navButtons.appendChild(b);
        });

        $("#submitSmall").addEventListener("click", confirmEndTest);
    }

    function goToQuestion(index) {
        if (index < 0) index = 0;
        if (index >= currentTest.questions.length) index = currentTest.questions.length - 1;
        currentTest.currentIndex = index;

        // reset per-question timer if in per-question mode
        if (currentTest.options.timerMode === "per") {
            currentTest.perQuestionTimeLeft = currentTest.options.perSec;
        }

        renderQuestionArea();
        renderNavigator();
    }

    /* ============================================================
       TIMER LOGIC
       - Maintains per-question & total timers based on options
       - When per-question expires -> auto-move to next and mark time
       - When total expires -> auto-submit
       ============================================================ */
    function startTimers() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            if (!currentTest || currentTest.paused) return;

            // total timer
            if (currentTest.options.timerMode === "total") {
                currentTest.totalTimeLeft--;
                if (currentTest.totalTimeLeft <= 0) {
                    currentTest.totalTimeLeft = 0;
                    submitTest("timeup");
                    return;
                }
                $("#totalTimer").textContent = "Total: " + formatTime(currentTest.totalTimeLeft);
            } else {
                $("#totalTimer").textContent = "";
            }

            // per-question timer
            if (currentTest.options.timerMode === "per") {
                currentTest.perQuestionTimeLeft--;
                $("#perQTimer").textContent = `Q time: ${currentTest.perQuestionTimeLeft}s`;

                if (currentTest.perQuestionTimeLeft <= 0) {
                    // record as unanswered if no selection, move next
                    saveCurrentQuestionTime(/*expired=*/true);
                    if (currentTest.currentIndex < currentTest.questions.length - 1) {
                        goToQuestion(currentTest.currentIndex + 1);
                    } else {
                        submitTest("timeup");
                    }
                }
            } else {
                $("#perQTimer").textContent = "";
            }

            // global elapsed
            currentTest.elapsed++;
        }, 1000);
    }

    function togglePause() {
        currentTest.paused = !currentTest.paused;
        $("#pauseResumeBtn").textContent = currentTest.paused ? "Resume" : "Pause";

        if (currentTest.paused) {
            // stop timers visually by halting interval indirectly
        } else {
            // resume
        }
    }

    function saveCurrentQuestionTime(expired=false) {
        const q = currentTest.questions[currentTest.currentIndex];
        // approximate: add timeSpent as per-question total - left
        if (currentTest.options.timerMode === "per") {
            const used = currentTest.options.perSec - (currentTest.perQuestionTimeLeft || 0);
            q.timeSpent += used;
        } else {
            q.timeSpent += 1; // best-effort increment (since no precise per-second tracking)
        }

        if (expired && !q.selected) {
            // leave selected as null (unattempted)
        }
    }

    /* ============================================================
       SUBMIT FLOW
       ============================================================ */
    function confirmEndTest() {
        if (!confirm("Submit test now?")) return;
        submitTest("manual");
    }

    function submitTest(reason="manual") {
        clearInterval(timerInterval);
        // compute scores
        let correct = 0, attempted = 0;
        currentTest.questions.forEach(q => {
            if (q.selected) attempted++;
            if (q.selected === q.correct) correct++;
        });

        const total = currentTest.questions.length;
        const score = correct; // simple scoring; no negative marking

        const timeTaken = Math.floor((Date.now() - currentTest.startedAt) / 1000);

        // build history object for storage
        const subject = currentTest.subjectId ? (getSubjects().find(s => s.id === currentTest.subjectId)?.name || "") : "";
        const history = {
            testId: currentTest.id,
            subjectId: currentTest.subjectId,
            subjectName: subject,
            topicId: currentTest.topicId,
            options: currentTest.options,
            questions: currentTest.questions.map(q => ({
                id: q.id,
                selected: q.selected,
                correct: q.correct,
                timeSpent: q.timeSpent || 0,
                marked: q.marked
            })),
            totalQuestions: total,
            attempted,
            correct,
            score,
            timeTaken,
            violations: visibilityViolations + (currentTest.violations || 0),
            startedAt: new Date(currentTest.startedAt).toISOString(),
            finishedAt: new Date().toISOString(),
            submitReason: reason
        };

        // save to DB if function available
        try {
            addTestHistory(history);
        } catch (err) {
            console.warn("addTestHistory not available", err);
        }

        // close fullscreen if active
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(()=>{/*ignore*/});
        }

        // show results
        openResultsUI(history);

        // cleanup
        const qc = $("#quizContainer");
        if (qc) qc.remove();
        window.removeEventListener("keydown", handleQuizKeydown);
    }

    /* ============================================================
       RESULTS UI
       ============================================================ */
    function openResultsUI(history) {
        const existing = $("#resultsContainer");
        if (existing) existing.remove();

        const cont = createEl("div");
        cont.id = "resultsContainer";
        cont.style.position = "fixed";
        cont.style.inset = "0";
        cont.style.background = "rgba(0,0,0,0.6)";
        cont.style.display = "flex";
        cont.style.alignItems = "center";
        cont.style.justifyContent = "center";
        cont.style.zIndex = 10000;

        const box = createEl("div");
        box.style.width = "86%";
        box.style.maxWidth = "980px";
        box.style.maxHeight = "90%";
        box.style.overflow = "auto";
        box.style.background = "#fff";
        box.style.padding = "20px";
        box.style.borderRadius = "8px";

        const acc = Math.round(((history.correct / history.totalQuestions) * 100) || 0);
        const html = `
            <h2>Results</h2>
            <p><strong>Score:</strong> ${history.score} / ${history.totalQuestions} (${acc}%)</p>
            <p><strong>Attempted:</strong> ${history.attempted} • <strong>Unattempted:</strong> ${history.totalQuestions - history.attempted}</p>
            <p><strong>Time Taken:</strong> ${formatTime(history.timeTaken)}</p>
            <p><strong>Violations:</strong> ${history.violations}</p>

            <h3>Question Review</h3>
            <div id="reviewList"></div>

            <div style="margin-top:18px;text-align:right">
                <button id="closeResults" class="btn-secondary">Close</button>
                <button id="downloadReport" class="btn-primary">Download Report</button>
            </div>
        `;

        box.innerHTML = html;
        cont.appendChild(box);
        document.body.appendChild(cont);

        // render per-question review
        const reviewList = $("#reviewList");
        history.questions.forEach((qh, idx) => {
            const qData = getQuestions().find(x => x.id === qh.id) || {};
            const wrapper = createEl("div");
            wrapper.style.border = "1px solid #eee";
            wrapper.style.padding = "12px";
            wrapper.style.borderRadius = "6px";
            wrapper.style.marginBottom = "10px";

            const correctChoice = qData.correctChoice || qh.correct;
            const choices = qData.choices || {};

            let choicesHtml = "";
            if (choices && Object.keys(choices).length) {
                for (const k of Object.keys(choices)) {
                    const txt = choices[k];
                    const isSelected = qh.selected === k;
                    const isCorrect = correctChoice === k;
                    const mark = isCorrect ? "✓" : (isSelected ? "✕" : "");
                    choicesHtml += `<div style="padding:6px;border-radius:4px;margin-bottom:6px;background:${isCorrect ? "#e6ffea" : isSelected ? "#fff0f0" : "#fff"}">
                        <strong>${k}.</strong> ${txt} ${mark ? `<strong style="margin-left:8px">${mark}</strong>`: ""}
                    </div>`;
                }
            } else {
                // fallback — if choices not available, show selected/correct keys
                choicesHtml = `<div>Selected: ${qh.selected || "—"}</div><div>Correct: ${qh.correct || "—"}</div>`;
            }

            wrapper.innerHTML = `<div><strong>Q${idx+1}:</strong> ${qData.questionText || "Question text unavailable"}</div>
                <div style="margin-top:8px">${choicesHtml}</div>
                <div style="margin-top:8px;font-size:13px;color:#666">Time spent: ${qh.timeSpent || 0}s</div>
            `;

            reviewList.appendChild(wrapper);
        });

        $("#closeResults").addEventListener("click", () => {
            cont.remove();
        });

        $("#downloadReport").addEventListener("click", () => {
            const report = {
                summary: {
                    score: history.score,
                    total: history.totalQuestions,
                    attempted: history.attempted,
                    correct: history.correct,
                    accuracy: acc,
                    timeTaken: history.timeTaken,
                    violations: history.violations,
                    date: history.finishedAt
                },
                questions: history.questions
            };
            downloadFile(`quiz_report_${history.testId}.json`, JSON.stringify(report, null, 2));
        });
    }

    /* ============================================================
       ANTI-CHEAT: visibility change & counting
       ============================================================ */
    function bindGlobalAntiCheat() {
        document.addEventListener("visibilitychange", () => {
            if (!currentTest) return;
            if (document.hidden) {
                visibilityViolations++;
                currentTest.violations = (currentTest.violations || 0) + 1;
                // optionally auto-pause if too many violations
                if (currentTest.violations >= 3) {
                    // auto-submit as penalty
                    submitTest("violations");
                } else {
                    // small warning
                    flashMessage("Switching tabs detected — test may be flagged.", 3000);
                }
            }
        });
    }

    function flashMessage(text, ms = 2000) {
        const box = createEl("div");
        box.style.position = "fixed";
        box.style.bottom = "18px";
        box.style.left = "50%";
        box.style.transform = "translateX(-50%)";
        box.style.background = "#222";
        box.style.color = "#fff";
        box.style.padding = "10px 16px";
        box.style.borderRadius = "8px";
        box.style.zIndex = 12000;
        box.textContent = text;
        document.body.appendChild(box);
        setTimeout(()=>box.remove(), ms);
    }

    /* ============================================================
       KEYBOARD NAVIGATION
       ============================================================ */
    function handleQuizKeydown(e) {
        if (!currentTest) return;
        if (e.key === "ArrowRight") {
            saveCurrentQuestionTime();
            goToQuestion(currentTest.currentIndex + 1);
        } else if (e.key === "ArrowLeft") {
            saveCurrentQuestionTime();
            goToQuestion(currentTest.currentIndex - 1);
        } else if (e.key === "m" || e.key === "M") {
            const q = currentTest.questions[currentTest.currentIndex];
            q.marked = !q.marked;
            renderNavigator();
            renderQuestionArea();
        }
    }

    /* ============================================================
       DAILY QUIZ
       - One random quiz per day per local installation
       ============================================================ */
    function attachDailyQuizStatus() {
        if (!startDailyQuizBtn) return;

        const dq = getDailyQuiz();
        const today = todayString();

        if (dq.lastDate === today) {
            dailyQuizStatusEl.textContent = "You have already taken today's quiz.";
        } else {
            dailyQuizStatusEl.textContent = "Today's quiz available.";
        }

        startDailyQuizBtn.addEventListener("click", () => {
            const dq = getDailyQuiz();
            const today = todayString();
            if (dq.lastDate === today) {
                alert("You have already taken today's quiz. Come back tomorrow!");
                return;
            }

            // generate daily quiz with default 10 random questions from all subjects
            const pool = getQuestions();
            if (!pool || !pool.length) return alert("No questions in DB.");

            const chosen = shuffleArray(pool).slice(0, 10);
            const options = { count: chosen.length, timerMode: "total", totalSec: 600, perSec: 30, shuffle: true, fullscreen: false };

            currentTest = {
                id: randomId("daily"),
                subjectId: null,
                topicId: null,
                options,
                questions: chosen.map(q => ({
                    id: q.id,
                    prompt: q.questionText,
                    choices: Object.entries(q.choices).map(([k,v]) => ({ key:k, text:v })),
                    correct: q.correctChoice,
                    image: q.imageBase64 || "",
                    timeSpent: 0,
                    selected: null,
                    marked: false
                })),
                startedAt: Date.now(),
                paused: false,
                elapsed: 0,
                totalTimeLeft: options.totalSec,
                perQuestionTimeLeft: null,
                currentIndex: 0,
                violations: 0
            };

            // store that today's quiz was generated (we'll mark taken on submit)
            setDailyQuiz(today, currentTest.id);

            openQuizUI();
            startTimers();
        });
    }

    /* ============================================================
       CUSTOM TEST BUILDER (small UI)
       - Allow selecting multiple topics or questions and start a custom test
       ============================================================ */
    function openCustomBuilder() {
        // show modal with ability to pick subjects/topics or paste question ids
        const modal = createEl("div");
        modal.style.position = "fixed";
        modal.style.inset = 0;
        modal.style.background = "rgba(0,0,0,0.4)";
        modal.style.display = "flex";
        modal.style.alignItems = "center";
        modal.style.justifyContent = "center";
        modal.style.zIndex = 9999;

        const box = createEl("div");
        box.style.background = "#fff";
        box.style.padding = "18px";
        box.style.width = "720px";
        box.style.maxHeight = "80%";
        box.style.overflow = "auto";
        box.style.borderRadius = "8px";

        const subjects = getSubjects();
        let html = `<h3>Custom Test Builder</h3>
            <p>Select subjects/topics or paste question IDs (comma separated).</p>
            <div style="display:flex;gap:12px;margin-top:12px;">
                <div style="flex:1">
                    <label>Select Subject</label>
                    <select id="cbSubject" style="width:100%;padding:8px;margin-top:6px;"><option value="">All Subjects</option>`;
        subjects.forEach(s => html += `<option value="${s.id}">${s.name}</option>`);
        html += `</select>
                    <div id="cbTopicList" style="margin-top:8px;"></div>
                </div>

                <div style="flex:1">
                    <label>Paste Question IDs</label>
                    <textarea id="cbQids" placeholder="q_abc123,q_def456" style="width:100%;height:120px;margin-top:6px;"></textarea>
                </div>
            </div>

            <div style="margin-top:12px;text-align:right;">
                <button id="cbCancel" class="btn-secondary">Cancel</button>
                <button id="cbStart" class="btn-primary">Start Custom Test</button>
            </div>`;

        box.innerHTML = html;
        modal.appendChild(box);
        document.body.appendChild(modal);

        const cbSubject = $("#cbSubject", modal);
        const cbTopicList = $("#cbTopicList", modal);

        cbSubject.addEventListener("change", () => {
            const subId = cbSubject.value;
            const topics = getTopics(subId);
            if (!topics.length) {
                cbTopicList.innerHTML = "<p>No topics</p>";
                return;
            }
            let inner = `<label>Topics (choose multiple by ctrl/cmd)</label>
                <select id="cbTopics" multiple style="width:100%;height:120px;margin-top:6px">`;
            topics.forEach(t => inner += `<option value="${t.id}">${t.name}</option>`);
            inner += "</select>";
            cbTopicList.innerHTML = inner;
        });

        $("#cbCancel", modal).addEventListener("click", () => modal.remove());
        $("#cbStart", modal).addEventListener("click", () => {
            const qids = $("#cbQids", modal).value.trim();
            let chosen = [];

            if (qids) {
                const ids = qids.split(",").map(x=>x.trim()).filter(Boolean);
                // pick questions by ids
                ids.forEach(id => {
                    const q = getQuestions().find(q=>q.id===id);
                    if (q) chosen.push(q);
                });
            } else {
                const selectedTopicsEl = $("#cbTopics", modal);
                if (selectedTopicsEl) {
                    const sel = Array.from(selectedTopicsEl.selectedOptions).map(o=>o.value);
                    sel.forEach(tid => {
                        const qs = getQuestions({ topicId: tid });
                        chosen.push(...qs);
                    });
                } else {
                    // all questions under subject
                    const subId = cbSubject.value;
                    const qs = getQuestions({ subjectId: subId });
                    chosen.push(...qs);
                }
            }

            if (!chosen.length) {
                alert("No questions selected.");
                return;
            }

            const options = { count: chosen.length, timerMode: "off", perSec:30, totalSec:600, shuffle: true, fullscreen:false };

            currentTest = {
                id: randomId("custom"),
                subjectId: null,
                topicId: null,
                options,
                questions: chosen.map(q => ({
                    id: q.id, prompt: q.questionText,
                    choices: Object.entries(q.choices).map(([k,v])=>({key:k,text:v})),
                    correct: q.correctChoice, image: q.imageBase64||"",
                    timeSpent:0, selected:null, marked:false
                })),
                startedAt: Date.now(),
                paused:false, elapsed:0, totalTimeLeft:options.totalSec, perQuestionTimeLeft:null, currentIndex:0, violations:0
            };

            modal.remove();
            openQuizUI();
            startTimers();
        });
    }

    /* ============================================================
       EXPORTS (expose some helper functions to window)
       ============================================================ */
    if (typeof GLOBAL !== "undefined") {
        GLOBAL.openCustomBuilder = openCustomBuilder;
        GLOBAL.openStartTestModal = openStartTestModal; // direct access if needed
    }

    /* ============================================================
       INITIALIZE
       ============================================================ */
    setTimeout(init, 200);

})();
