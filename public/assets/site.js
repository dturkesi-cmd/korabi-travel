/** Shared UI helpers for Korabi subpages */
(function () {
  "use strict";

  var toastTimer;

  function observeReveal(root) {
    var scope = root || document;
    var els = scope.querySelectorAll(".reveal:not(.visible)");
    if (!els.length) return;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      }, { threshold: 0.1 });
      els.forEach(function (el) { io.observe(el); });
    } else {
      els.forEach(function (el) { el.classList.add("visible"); });
    }
  }

  window.korabiObserveReveal = observeReveal;
  observeReveal();

  function ensureToastEl() {
    var toast = document.getElementById("korabiToast");
    if (toast) return toast;
    toast = document.createElement("div");
    toast.id = "korabiToast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.innerHTML = '<span id="korabiToastMsg"></span>';
    document.body.appendChild(toast);
    return toast;
  }

  window.korabiToast = function (message) {
    if (!message) return;
    var toast = ensureToastEl();
    var msg = document.getElementById("korabiToastMsg");
    if (msg) msg.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2800);
  };

  function footerHtml(showAdmin) {
    var adminLink = showAdmin
      ? '<a href="/admin" class="admin-only visible">Admin desk</a>'
      : '<a href="/admin" class="admin-only">Admin desk</a>';
    return (
      '<div class="wrap">' +
        '<div class="foot-grid">' +
          '<div>' +
            '<a class="brand" href="/"><img class="mark" src="/assets/korabi-mark.svg" alt=""> korabi</a>' +
            '<p class="lede">Live flight search, escrow-protected seat resale, and ARC desk support.</p>' +
          '</div>' +
          '<div class="col"><h4>Fly</h4><a href="/">Search flights</a><a href="/marketplace">Seat marketplace</a></div>' +
          '<div class="col"><h4>Account</h4><a href="/login">Sign in</a><a href="/account">My trips</a>' + adminLink + '</div>' +
        '</div>' +
        '<div class="foot-bottom">' +
          '<span>© 2026 Korabi Travel · Demo storefront</span>' +
          '<span>Operating carrier shown per US DOT rules.</span>' +
        '</div>' +
      '</div>'
    );
  }

  function updateAdminFooterLinks(showAdmin) {
    document.querySelectorAll(".site-footer .admin-only, footer .admin-only").forEach(function (a) {
      a.classList.toggle("visible", !!showAdmin);
    });
  }

  function renderFooter(showAdmin) {
    var mount = document.getElementById("korabiFooter");
    if (mount) {
      mount.className = "site-footer";
      mount.innerHTML = footerHtml(showAdmin);
      return;
    }
    if (!document.querySelector("footer")) {
      var el = document.createElement("footer");
      el.id = "korabiFooter";
      el.className = "site-footer";
      el.innerHTML = footerHtml(showAdmin);
      document.body.appendChild(el);
    } else {
      updateAdminFooterLinks(showAdmin);
    }
  }

  window.korabiRenderFooter = renderFooter;

  document.addEventListener("korabi-auth", function (e) {
    var user = e.detail && e.detail.user;
    renderFooter(user && user.role === "admin");
  });

  renderFooter(window.korabiUser && window.korabiUser.role === "admin");

  var scrollBtn = document.getElementById("scrollTopBtn");
  if (scrollBtn) {
    window.addEventListener("scroll", function () {
      scrollBtn.classList.toggle("visible", window.scrollY > 480);
    }, { passive: true });
    scrollBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
