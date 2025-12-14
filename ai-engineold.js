/* =====================================
   AI ENGINE (NON-INTRUSIVE)
   GovExams Practice App
   -------------------------------------
   - Read-only intelligence layer
   - Does NOT modify quiz flow
   - Works offline
   - Fails silently if data missing
===================================== */

(function () {
  "use strict";

  /* =========================
     SAFE HELPERS
  ========================= */
  function safeJSON(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  }

  function percent(correct, total) {
    if (!total) return 0;
    return Math.round((correct / total) * 100);
  }

  /* =========================
     CORE DATA READERS
  ========================= */
  function getQuizHistory() {
    return safeJSON("quizHistory", []);
  }

  /* =========================
     AI ANALYSIS
  ========================= */
  function analyzePerformance() {
    const history = getQuizHistory();
    if (!history.length) return null;

    const subjectStats = {};

    history.forEach(attempt => {
      const subject = attempt.subject || "Unknown";
      const correct = attempt.correct || 0;
      const attempted = attempt.attempted || 0;

      if (!subjectStats[subject]) {
        subjectStats[subject] = { correct: 0, attempted: 0 };
      }

      subjectStats[subject].correct += correct;
      subjectStats[subject].attempted += attempted;
    });

    const insights = Object.entries(subjectStats).map(([subject, data]) => ({
      subject,
      accuracy: percent(data.correct, data.attempted)
    }));

    insights.sort((a, b) => a.accuracy - b.accuracy);

    return insights;
  }

  /* =========================
     UI INJECTION (SAFE)
  ========================= */
  function injectAIInsights() {
    const container = document.getElementById("home");
    if (!container) return;

    const insights = analyzePerformance();
    if (!insights || !insights.length) return;

    const weak = insights[0];

    const box = document.createElement("div");
    box.style.marginTop = "24px";
    box.style.padding = "16px";
    box.style.borderRadius = "12px";
    box.style.background = "#eff6ff";
    box.style.border = "1px solid #dbeafe";

    box.innerHTML = `
      <h3 style="margin-bottom:6px; color:#1e40af">📊 Smart Insight</h3>
      <p style="font-size:14px; color:#1e3a8a">
        Your weakest subject is <strong>${weak.subject}</strong>
        (Accuracy: ${weak.accuracy}%).<br>
        Recommended: Practice this subject today.
      </p>
    `;

    container.appendChild(box);
  }

  /* =========================
     BOOTSTRAP (NON-BLOCKING)
  ========================= */
  document.addEventListener("DOMContentLoaded", () => {
    try {
      injectAIInsights();
    } catch {
      /* silent fail */
    }
  });

})();
