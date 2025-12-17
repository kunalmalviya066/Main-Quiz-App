/* ===============================
   POLICY & RULES ENGINE
   Non-intrusive | Standalone
   =============================== */

(function () {
  const ADMIN_EMAIL = "admin@gmail.com"; // 👈 change if needed
  const STORAGE_KEY = "gov_policy_rules";

  /* ---------- Default Content ---------- */
  const DEFAULT_POLICY = {
    policy: `
1. This platform is intended for exam practice only.
2. Any misuse or attempt to bypass rules may result in account restriction.
3. User data is stored locally for performance analysis only.
    `,
    rules: `
1. Tab switching is monitored during quizzes.
2. Copy, paste, and right-click actions are restricted.
3. Quizzes auto-submit on rule violation or time expiry.
4. Results once submitted cannot be altered.
    `,
    updatedAt: new Date().toLocaleString()
  };

  /* ---------- Init Storage ---------- */
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_POLICY));
  }

  const data = JSON.parse(localStorage.getItem(STORAGE_KEY));

  /* ---------- Admin Detection ---------- */
  function isAdmin() {
    try {
      const session = localStorage.getItem("session");
      return session && session === ADMIN_EMAIL;
    } catch {
      return false;
    }
  }

  /* ---------- Floating Button ---------- */
  const btn = document.createElement("button");
  btn.innerText = "📜 Policy & Rules";
  btn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    background: #0d6efd;
    color: #fff;
    border: none;
    padding: 12px 16px;
    border-radius: 30px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  `;
  document.body.appendChild(btn);

  /* ---------- Modal ---------- */
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.6);
    display: none;
    z-index: 10000;
    justify-content: center;
    align-items: center;
  `;

  modal.innerHTML = `
    <div style="
      background: #fff;
      color: #000;
      width: min(700px, 90%);
      max-height: 90vh;
      overflow-y: auto;
      border-radius: 12px;
      padding: 20px;
      position: relative;
    ">
      <h2>📜 Website Policy & Quiz Rules</h2>

      <label><strong>Policy</strong></label>
      <textarea id="policyText" style="width:100%;height:120px;" ${
        isAdmin() ? "" : "disabled"
      }>${data.policy}</textarea>

      <label><strong>Quiz Rules</strong></label>
      <textarea id="rulesText" style="width:100%;height:120px;" ${
        isAdmin() ? "" : "disabled"
      }>${data.rules}</textarea>

      <p style="font-size:12px;color:gray;">
        Last Updated: <span id="updatedAt">${data.updatedAt}</span>
      </p>

      <div style="display:flex;gap:10px;justify-content:flex-end;">
        ${
          isAdmin()
            ? `<button id="savePolicy" style="background:#198754;color:#fff;">Save Changes</button>`
            : ""
        }
        <button id="closePolicy">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  /* ---------- Events ---------- */
  btn.onclick = () => (modal.style.display = "flex");
  modal.querySelector("#closePolicy").onclick = () =>
    (modal.style.display = "none");

  if (isAdmin()) {
    modal.querySelector("#savePolicy").onclick = () => {
      const updated = {
        policy: modal.querySelector("#policyText").value.trim(),
        rules: modal.querySelector("#rulesText").value.trim(),
        updatedAt: new Date().toLocaleString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      modal.querySelector("#updatedAt").innerText = updated.updatedAt;
      alert("Policy & Rules updated successfully");
    };
  }
})();
