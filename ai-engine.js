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
        const prevAcc = percent(recent[i - 1].correct || 0, recent[i - 1].attempted || 0);
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
    ).join(' ');

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
     AI QUIZ REVIEW SUMMARY
  ========================= */
  function generateQuizReviewSummary() {
    const history = getQuizHistory();
    if (!history.length) return null;

    const last = history[history.length - 1];
    if (!last) return null;

    const accuracy = percent(last.correct || 0, last.attempted || 0);
    const unattempted = last.unattempted || 0;
    const timeTaken = last.timeTaken || null;

    let strength = "Consistency";
    let weakness = "Accuracy";
    let tip = "Maintain regular practice.";

    if (accuracy >= 75) {
      strength = last.subject || "Overall Performance";
      tip = "Try increasing difficulty or attempting a full mock.";
    } else if (accuracy >= 50) {
      weakness = last.subject || "Concept clarity";
      tip = "Revise weak topics and reattempt similar questions.";
    } else {
      weakness = last.subject || "Fundamentals";
      tip = "Slow down and focus on concept-based questions.";
    }

    return {
      accuracy,
      strength,
      weakness,
      unattempted,
      timeTaken,
      tip
    };
  }

  function renderQuizReviewSummary() {
    const container = document.getElementById("result-details") || document.getElementById("result-summary");
    if (!container) return;

    const summary = generateQuizReviewSummary();
    if (!summary) return;

    const box = document.createElement("div");
    box.style.marginTop = "24px";
    box.style.padding = "18px";
    box.style.borderRadius = "14px";
    box.style.background = "#eff6ff";
    box.style.border = "1px solid #dbeafe";

    box.innerHTML = `
      <h3 style="margin-bottom:8px; color:#1e40af">🧠 AI Quiz Review</h3>
      <ul style="font-size:14px; color:#1e3a8a; line-height:1.6">
        <li><strong>Accuracy:</strong> ${summary.accuracy}%</li>
        <li><strong>Strength:</strong> ${summary.strength}</li>
        <li><strong>Needs Improvement:</strong> ${summary.weakness}</li>
        <li><strong>Unattempted:</strong> ${summary.unattempted}</li>
      </ul>
      <p style="margin-top:10px; font-size:14px; color:#0f172a">
        <strong>AI Tip:</strong> ${summary.tip}
      </p>
    `;

    container.prepend(box);
  }

  /* =========================
     BOOTSTRAP EXTENSION
  ========================= */
  document.addEventListener("DOMContentLoaded", () => {
    try {
      injectAIInsights();
      renderConfidenceScore();
      renderQuizReviewSummary();
    } catch {
      /* silent fail */
    }
  });

})();
