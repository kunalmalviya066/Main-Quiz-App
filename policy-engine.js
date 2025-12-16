/* =====================================================
   POLICY & RULES ENGINE — SECURE VERSION
   Single File | Non-Intrusive | Root Level
   ===================================================== */

(function () {
  const ADMIN_CREDENTIALS = {
    email: "admin@gmail.com",
    password: "Admin@123"
  };

  const STORAGE_KEY = "gov_policy_rules";
  const LOCK_KEY = "policy_admin_lock";
  const ATTEMPT_KEY = "policy_admin_attempts";

  const MAX_ATTEMPTS = 2;
  const LOCK_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  /* ---------- Default Policy ---------- */
  const DEFAULT_POLICY = {
    policy: `1. This platform is for exam practice only.
2. Any misuse may result in access restriction.`,
    rules: `1. Tab switching is monitored.
2. Copy / paste is restricted.
3. Auto-submit on rule violation.`,
    updatedAt: new Date().toLocaleString()
  };

  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_POLICY));
  }

  function isLocked() {
    const lockUntil = localStorage.getItem(LOCK_KEY);
    if (!lockUntil) return false;
    if (Date.now() > Number(lockUntil)) {
      localStorage.removeItem(LOCK_KEY);
      localStorage.removeItem(ATTEMPT_KEY);
      return false;
    }
    return true;
  }

  function remainingLockTime() {
    const lockUntil = localStorage.getItem(LOCK_KEY);
    return Math.max(0, Math.ceil((lockUntil - Date.now()) / 3600000));
  }

  /* ---------- Floating Button ---------- */
  const btn = document.createElement("button");
  btn.innerText = "📜 Policy & Rules";
  btn.style.cssText = `
    position:fixed;bottom:20px;right:20px;z-index:9999;
    background:#0d6efd;color:#fff;border:none;
    padding:12px 18px;border-radius:30px;
    font-weight:600;cursor:pointer;
    box-shadow:0 8px 20px rgba(0,0,0,.25)
  `;
  document.body.appendChild(btn);

  /* ---------- Modal ---------- */
  const modal = document.createElement("div");
  modal.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.6);
    display:none;z-index:10000;
    justify-content:center;align-items:center;
  `;

  document.body.appendChild(modal);

  btn.onclick = () => renderView(false);

  function renderView(isAdmin) {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    modal.innerHTML = `
      <div style="background:#fff;color:#000;width:min(720px,92%);
      max-height:90vh;overflow:auto;border-radius:12px;padding:20px">
        <h2>📜 Website Policy & Quiz Rules</h2>

        <label><b>Policy</b></label>
        <textarea id="policyText" style="width:100%;height:120px" ${
          isAdmin ? "" : "disabled"
        }>${data.policy}</textarea>

        <label><b>Quiz Rules</b></label>
        <textarea id="rulesText" style="width:100%;height:120px" ${
          isAdmin ? "" : "disabled"
        }>${data.rules}</textarea>

        <p style="font-size:12px;color:gray">
          Last Updated: ${data.updatedAt}
        </p>

        ${
          !isAdmin
            ? `
          <hr>
          ${
            isLocked()
              ? `<p style="color:red">
                   Admin access locked for ${remainingLockTime()} hour(s)
                 </p>`
              : `
                <h4>🔐 Admin Verification</h4>
                <input id="adminEmail" placeholder="Admin Email" style="width:100%;margin-bottom:8px">
                <input id="adminPass" type="password" placeholder="Admin Password" style="width:100%;margin-bottom:8px">
                <button id="verifyAdmin">Verify & Edit</button>
              `
          }
        `
            : `
          <button id="savePolicy" style="background:#198754;color:#fff">Save Changes</button>
        `
        }

        <button id="closeModal" style="margin-left:10px">Close</button>
      </div>
    `;

    modal.style.display = "flex";

    document.getElementById("closeModal").onclick = () =>
      (modal.style.display = "none");

    if (!isAdmin && !isLocked()) {
      document.getElementById("verifyAdmin").onclick = verifyAdmin;
    }

    if (isAdmin) {
      document.getElementById("savePolicy").onclick = savePolicy;
    }
  }

  function verifyAdmin() {
    const email = document.getElementById("adminEmail").value.trim();
    const pass = document.getElementById("adminPass").value.trim();

    let attempts = Number(localStorage.getItem(ATTEMPT_KEY) || 0);

    if (
      email === ADMIN_CREDENTIALS.email &&
      pass === ADMIN_CREDENTIALS.password
    ) {
      localStorage.removeItem(ATTEMPT_KEY);
      renderView(true);
      return;
    }

    attempts++;
    localStorage.setItem(ATTEMPT_KEY, attempts);

    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem(LOCK_KEY, Date.now() + LOCK_DURATION);
      alert("Too many wrong attempts. Admin access locked for 24 hours.");
      renderView(false);
    } else {
      alert(`Invalid credentials. Attempt ${attempts}/${MAX_ATTEMPTS}`);
    }
  }

  function savePolicy() {
    const updated = {
      policy: document.getElementById("policyText").value.trim(),
      rules: document.getElementById("rulesText").value.trim(),
      updatedAt: new Date().toLocaleString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    alert("Policy & Rules updated successfully");
    modal.style.display = "none";
  }
})();
