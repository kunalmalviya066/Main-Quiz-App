/* ============================================================
   Exam Integrity Engine (One-File Extension)
   Non-intrusive | LocalStorage-only | Plug & Play
============================================================ */

(function () {
  const INTEGRITY_KEY = "__exam_integrity_live";
  const ATTEMPT_KEY = "examAttempts"; // adjust ONLY if your app uses a different key

  // ----------------------------
  // Live Integrity Tracker
  // ----------------------------
  const integrity = {
    tabSwitches: 0,
    windowBlurs: 0,
    pauses: 0,
    fastAnswers: 0,
    answerTimes: [],
    lastAnswerTime: null,
    startTime: Date.now()
  };

  // Store live state
  localStorage.setItem(INTEGRITY_KEY, JSON.stringify(integrity));

  // ----------------------------
  // Event Listeners (Passive)
  // ----------------------------
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      integrity.tabSwitches++;
      persist();
    }
  });

  window.addEventListener("blur", () => {
    integrity.windowBlurs++;
    persist();
  });

  // Optional pause detection (if pause button exists)
  document.addEventListener("click", (e) => {
    if (e.target && e.target.innerText?.toLowerCase().includes("pause")) {
      integrity.pauses++;
      persist();
    }
  });

  // Answer speed detection
  document.addEventListener("change", (e) => {
    if (e.target.type === "radio") {
      const now = Date.now();
      if (integrity.lastAnswerTime) {
        const diff = (now - integrity.lastAnswerTime) / 1000;
        integrity.answerTimes.push(diff);
        if (diff < 3) integrity.fastAnswers++;
      }
      integrity.lastAnswerTime = now;
      persist();
    }
  });

  function persist() {
    localStorage.setItem(INTEGRITY_KEY, JSON.stringify(integrity));
  }

  // ----------------------------
  // Score Calculator
  // ----------------------------
  function calculateIntegrityScore(data) {
    let score = 100;

    score -= data.tabSwitches * 10;
    score -= data.windowBlurs * 5;
    score -= data.pauses * 8;
    score -= data.fastAnswers * 4;

    // Suspicious pattern: too consistent speed
    if (data.answerTimes.length >= 5) {
      const avg =
        data.answerTimes.reduce((a, b) => a + b, 0) /
        data.answerTimes.length;

      const variance =
        data.answerTimes.reduce((s, t) => s + Math.pow(t - avg, 2), 0) /
        data.answerTimes.length;

      if (variance < 1) score -= 10;
    }

    return Math.max(score, 0);
  }

  function getRiskLabel(score) {
    if (score >= 85) return { label: "Low Risk", icon: "✅", color: "green" };
    if (score >= 60) return { label: "Medium Risk", icon: "⚠", color: "orange" };
    return { label: "High Risk", icon: "🚫", color: "red" };
  }

  // ----------------------------
  // Attach Integrity to Last Attempt
  // ----------------------------
  window.addEventListener("beforeunload", finalizeIntegrity);
  document.addEventListener("examSubmitted", finalizeIntegrity);

  function finalizeIntegrity() {
    const live = JSON.parse(localStorage.getItem(INTEGRITY_KEY));
    if (!live) return;

    const score = calculateIntegrityScore(live);
    const risk = getRiskLabel(score);

    const attempts = JSON.parse(localStorage.getItem(ATTEMPT_KEY) || "[]");
    if (!attempts.length) return;

    attempts[attempts.length - 1].integrity = {
      score,
      risk: risk.label,
      details: live
    };

    localStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempts));
    localStorage.removeItem(INTEGRITY_KEY);
  }

  // ----------------------------
  // Result Page UI Injection
  // ----------------------------
  function injectIntegrityUI() {
    const attempts = JSON.parse(localStorage.getItem(ATTEMPT_KEY) || "[]");
    if (!attempts.length) return;

    const last = attempts[attempts.length - 1];
    if (!last.integrity) return;

    const { score, risk } = last.integrity;
    const meta = getRiskLabel(score);

    const box = document.createElement("div");
    box.style.cssText = `
      margin-top:20px;
      padding:16px;
      border-radius:10px;
      background:#111827;
      border-left:6px solid ${meta.color};
      font-weight:600;
    `;

    box.innerHTML = `
      <div style="font-size:18px">
        Exam Integrity: ${meta.icon} ${risk}
      </div>
      <div style="font-size:14px;opacity:.8;margin-top:6px">
        Trust Score: ${score}/100
      </div>
    `;

    const target =
      document.querySelector(".result-summary") ||
      document.querySelector("#result") ||
      document.body;

    target.appendChild(box);
  }

  // Delay injection (SPA safe)
  setTimeout(injectIntegrityUI, 1000);
})();
