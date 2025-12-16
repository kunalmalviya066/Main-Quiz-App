/* ============================================================
   Exam Integrity Engine (Guaranteed SPA-Compatible)
   Zero dependency | Zero modification | One file
============================================================ */

(function () {
  const ATTEMPT_KEY = "examAttempts";
  const LIVE_KEY = "__exam_integrity_live";

  // ----------------------------
  // Live tracker
  // ----------------------------
  const live = {
    tabSwitches: 0,
    blurs: 0,
    pauses: 0,
    fastAnswers: 0,
    answerTimes: [],
    lastAnswerAt: null
  };

  localStorage.setItem(LIVE_KEY, JSON.stringify(live));

  // ----------------------------
  // Passive detection
  // ----------------------------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      live.tabSwitches++;
      save();
    }
  });

  window.addEventListener("blur", () => {
    live.blurs++;
    save();
  });

  document.addEventListener("click", e => {
    if (e.target?.innerText?.toLowerCase().includes("pause")) {
      live.pauses++;
      save();
    }
  });

  document.addEventListener("change", e => {
    if (e.target?.type === "radio") {
      const now = Date.now();
      if (live.lastAnswerAt) {
        const diff = (now - live.lastAnswerAt) / 1000;
        live.answerTimes.push(diff);
        if (diff < 3) live.fastAnswers++;
      }
      live.lastAnswerAt = now;
      save();
    }
  });

  function save() {
    localStorage.setItem(LIVE_KEY, JSON.stringify(live));
  }

  // ----------------------------
  // Integrity scoring
  // ----------------------------
  function scoreIntegrity(d) {
    let score = 100;
    score -= d.tabSwitches * 10;
    score -= d.blurs * 5;
    score -= d.pauses * 8;
    score -= d.fastAnswers * 4;

    if (d.answerTimes.length >= 5) {
      const avg = d.answerTimes.reduce((a,b)=>a+b,0)/d.answerTimes.length;
      const variance = d.answerTimes.reduce((s,t)=>s+Math.pow(t-avg,2),0)/d.answerTimes.length;
      if (variance < 1) score -= 10;
    }
    return Math.max(score, 0);
  }

  function risk(score) {
    if (score >= 85) return { label: "Low Risk", icon: "✅", color: "green" };
    if (score >= 60) return { label: "Medium Risk", icon: "⚠", color: "orange" };
    return { label: "High Risk", icon: "🚫", color: "red" };
  }

  // ----------------------------
  // Detect NEW attempt (THIS IS THE KEY)
  // ----------------------------
  let lastCount = (JSON.parse(localStorage.getItem(ATTEMPT_KEY)) || []).length;

  setInterval(() => {
    const attempts = JSON.parse(localStorage.getItem(ATTEMPT_KEY)) || [];
    if (attempts.length > lastCount) {
      attachIntegrity(attempts);
      lastCount = attempts.length;
    }
  }, 800);

  function attachIntegrity(attempts) {
    const data = JSON.parse(localStorage.getItem(LIVE_KEY));
    if (!data) return;

    const score = scoreIntegrity(data);
    const r = risk(score);

    attempts[attempts.length - 1].integrity = {
      score,
      risk: r.label,
      details: data
    };

    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempts));
    localStorage.removeItem(LIVE_KEY);
  }

  // ----------------------------
  // Result UI Injection (safe)
  // ----------------------------
  setInterval(() => {
    const attempts = JSON.parse(localStorage.getItem(ATTEMPT_KEY)) || [];
    if (!attempts.length) return;

    const last = attempts[attempts.length - 1];
    if (!last.integrity || document.getElementById("integrity-box")) return;

    const r = risk(last.integrity.score);

    const box = document.createElement("div");
    box.id = "integrity-box";
    box.style.cssText = `
      margin-top:16px;
      padding:14px;
      border-radius:10px;
      background:#0f172a;
      border-left:6px solid ${r.color};
      font-weight:600;
    `;
    box.innerHTML = `
      Exam Integrity: ${r.icon} ${last.integrity.risk}
      <div style="font-size:13px;opacity:.8">
        Trust Score: ${last.integrity.score}/100
      </div>
    `;

    document.body.appendChild(box);
  }, 1000);
})();
