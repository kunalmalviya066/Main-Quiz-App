// ===============================
// Password validation regex
// min 6 chars, 1 letter, 1 number, 1 symbol
// ===============================
const passwordRegex =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&]).{6,}$/;

// ===============================
// SIGNUP
// ===============================
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword =
      document.getElementById("confirmPassword").value;

    if (!passwordRegex.test(password)) {
      alert(
        "Password must be at least 6 characters and include letters, numbers, and symbols."
      );
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const userExists = users.some(
      (u) => u.email === email || u.mobile === mobile
    );

    if (userExists) {
      alert("User already exists.");
      return;
    }

    users.push({ name, email, mobile, password });
    localStorage.setItem("users", JSON.stringify(users));

    alert("Signup successful! Please login.");
    window.location.href = "login.html";
  });
}

// ===============================
// LOGIN
// ===============================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const loginId = document.getElementById("loginId").value.trim();
    const loginPassword =
      document.getElementById("loginPassword").value;

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const user = users.find(
      (u) =>
        (u.email === loginId || u.mobile === loginId) &&
        u.password === loginPassword
    );

    if (!user) {
      alert("Invalid credentials.");
      return;
    }

    localStorage.setItem("loggedInUser", JSON.stringify(user));

    alert("Login successful!");
    window.location.href = "../index.html";
  });
}

// ===============================
// FORGOT PASSWORD (SECURE RESET)
// ===============================
function forgotPassword() {
  const emailOrMobile = prompt(
    "Enter your registered email or mobile:"
  );

  if (!emailOrMobile) return;

  const users = JSON.parse(localStorage.getItem("users")) || [];

  const userIndex = users.findIndex(
    (u) => u.email === emailOrMobile || u.mobile === emailOrMobile
  );

  if (userIndex === -1) {
    alert("No account found with this email or mobile.");
    return;
  }

  const newPassword = prompt(
    "Enter your new password (min 6 chars, include letter, number & symbol):"
  );

  if (!newPassword) return;

  if (!passwordRegex.test(newPassword)) {
    alert(
      "Password must be at least 6 characters and include letters, numbers, and symbols."
    );
    return;
  }

  const confirmPassword = prompt("Confirm your new password:");

  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  users[userIndex].password = newPassword;
  localStorage.setItem("users", JSON.stringify(users));

  alert("Password reset successful. Please login again.");
}
