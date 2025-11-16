/* ============================================================
   router.js — Simple SPA Router for QuizMaster
   ============================================================ */

(function () {

    const appView = document.getElementById("appView");
    const mobileNav = document.getElementById("mobileNav");
    const mobileMenuToggle = document.getElementById("mobileMenuToggle");

    /* ============================================================
       ROUTE MAP
       ============================================================ */
    const routes = {
        home: "home",
        subjects: "subjects",
        topicwise: "topicwise",
        dailyquiz: "dailyquiz",
        help: "help"
    };

    /* ============================================================
       SHOW PAGE FUNCTION
       ============================================================ */
    function showPage(pageId) {
        const allSections = appView.querySelectorAll(".page-section");
        allSections.forEach(sec => sec.classList.add("hidden"));

        const activeSection = document.getElementById(pageId);

        if (activeSection) {
            activeSection.classList.remove("hidden");
        } else {
            document.getElementById("home").classList.remove("hidden");
        }
    }

    /* ============================================================
       INITIAL ROUTING ON LOAD
       ============================================================ */
    function handleRoute() {
        let hash = location.hash.replace("#", "").trim();

        if (!hash || !routes[hash]) {
            showPage("home");
            return;
        }

        showPage(hash);
    }

    /* ============================================================
       LISTEN FOR HASH CHANGES
       ============================================================ */
    window.addEventListener("hashchange", handleRoute);
    window.addEventListener("load", handleRoute);

    /* ============================================================
       NAVIGATION BUTTONS (data-route)
       ============================================================ */
    document.body.addEventListener("click", function (e) {
        const btn = e.target.closest("[data-route]");
        if (!btn) return;

        const route = btn.getAttribute("data-route");
        if (routes[route]) {
            location.hash = route;
        }

        closeMobileMenu();
    });

    /* ============================================================
       MOBILE MENU CONTROLS
       ============================================================ */
    function closeMobileMenu() {
        if (mobileNav) mobileNav.style.display = "none";
    }

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener("click", () => {
            if (mobileNav.style.display === "flex") {
                mobileNav.style.display = "none";
            } else {
                mobileNav.style.display = "flex";
            }
        });
    }

})();
