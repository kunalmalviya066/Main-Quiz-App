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
     SMART INSIGHT (MATCHES CONFIDENCE UI)
  ========================= */
  function injectAIInsights() {
    const container = document.getElementById("home");
    if (!container) return;

    const insights = analyzePerformance();
    if (!insights || !insights.length) return;

    const weak = insights[0];

    const box = document.createElement("div");
    box.style.marginTop = "20px";
    box.style.padding = "16px";
    box.style.borderRadius = "12px";
    box.style.background = "#f8fafc";
    box.style.border = "1px solid #e2e8f0";

    box.innerHTML = `
      <h3 style="margin-bottom:6px; color:#0f172a">📊 Smart Insight</h3>
      <p style="font-size:14px; color:#475569">
        Your weakest subject is 
        <strong>${weak.subject}</strong> 
        (${weak.accuracy}% accuracy).<br>
        Focused practice here will improve your overall score.
      </p>
    `;

    container.appendChild(box);
  }

  /* =========================
     CONFIDENCE SCORE ENGINE
  ========================= */
  function calculateConfidenceScore() {
    const history = getQuizHistory();
    if (history.length < 3) return null;

    const recent = history.slice(-5);

    let totalAccuracy = 0;
    let improvementTrend = 0;

    recent.forEach((q, i) => {
      const acc = percent(q.correct || 0, q.attempted || 0);
      totalAccuracy += acc;

      if (i > 0) {
        const prevAcc = percent(
          recent[i - 1].correct || 0,
          recent[i - 1].attempted || 0
        );
        if (acc > prevAcc) improvementTrend++;
      }
    });

    const avgAccuracy = totalAccuracy / recent.length;

    let score = 0;
    if (avgAccuracy >= 80) score += 3;
    else if (avgAccuracy >= 60) score += 2;
    else score += 1;

    if (improvementTrend >= 2) score += 2;
    else if (improvementTrend === 1) score += 1;

    return Math.min(score, 5);
  }

  function renderConfidenceScore() {
    const container = document.getElementById("home");
    if (!container) return;

    const score = calculateConfidenceScore();
    if (!score) return;

    const dots = Array.from({ length: 5 }, (_, i) =>
      `<span style="font-size:18px; color:${i < score ? '#2563eb' : '#cbd5f5'}">●</span>`
    ).join(" ");

    const box = document.createElement("div");
    box.style.marginTop = "20px";
    box.style.padding = "16px";
    box.style.borderRadius = "12px";
    box.style.background = "#f8fafc";
    box.style.border = "1px solid #e2e8f0";

    box.innerHTML = `
      <h3 style="margin-bottom:6px; color:#0f172a">💙 Confidence Level</h3>
      <p style="margin-bottom:8px; font-size:14px; color:#475569">
        Based on your recent performance and improvement trend
      </p>
      <div>${dots}</div>
    `;

    container.appendChild(box);
  }

  /* =========================
     BOOTSTRAP (SAFE)
  ========================= */
  document.addEventListener("DOMContentLoaded", () => {
    try {
      injectAIInsights();
      renderConfidenceScore();
    } catch {
      /* silent fail */
    }
  });

})();
