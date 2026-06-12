(function () {
  "use strict";

  function getCsrf() {
    var m = document.cookie.match(/(?:^|;\s*)korabi_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  window.korabiFetch = function (url, opts) {
    opts = opts || {};
    var headers = Object.assign({ "Content-Type": "application/json", "X-CSRF-Token": getCsrf() }, opts.headers || {});
    return fetch(url, Object.assign({}, opts, { headers: headers, credentials: "same-origin" }));
  };

  var notifData = [];

  function renderAuth(user) {
    var slot = document.getElementById("authSlot");
    if (!slot) return;
    if (!user) {
      slot.innerHTML =
        '<a href="/login">Sign in</a>' +
        '<a href="/login?register=1" class="btn btn-primary" style="padding:9px 16px;font-size:.88rem;">Join free</a>';
      return;
    }
    var admin = user.role === "admin" ? '<a href="/admin">Admin</a>' : "";
    slot.innerHTML =
      '<span class="notif-wrap">' +
        '<button class="notif-btn" id="notifBtn" aria-label="Notifications" aria-expanded="false">🔔</button>' +
        '<div class="notif-panel" id="notifPanel" role="dialog" aria-label="Notifications">' +
          '<div class="notif-panel-head"><span>Notifications</span><button type="button" id="notifReadAll">Mark all read</button></div>' +
          '<div class="notif-list" id="notifList"><div class="notif-empty">Loading…</div></div>' +
        '</div>' +
      '</span>' +
      admin +
      '<a href="/account">' + (user.name || user.email) + '</a>' +
      '<button id="logoutBtn" class="muted" style="font-size:.85rem;">Log out</button>';

    document.getElementById("logoutBtn").addEventListener("click", function () {
      window.korabiFetch("/api/auth/logout", { method: "POST" }).then(function () { location.reload(); });
    });

    var btn = document.getElementById("notifBtn");
    var panel = document.getElementById("notifPanel");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = panel.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) loadNotifications(true);
    });
    document.getElementById("notifReadAll").addEventListener("click", function () {
      window.korabiFetch("/api/notifications/read-all", { method: "POST" }).then(function () {
        loadNotifications(true);
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".notif-wrap")) panel.classList.remove("open");
    });
    loadNotifications();
  }

  function renderNotifList(items) {
    var list = document.getElementById("notifList");
    if (!list) return;
    if (!items.length) {
      list.innerHTML = '<div class="notif-empty">No notifications yet — bookings and marketplace updates appear here.</div>';
      return;
    }
    list.innerHTML = items.slice(0, 12).map(function (n) {
      return '<div class="notif-item' + (n.read ? "" : " unread") + '">' +
        '<b>' + n.title + '</b>' + n.message +
        '<time>' + new Date(n.created_at).toLocaleString() + '</time></div>';
    }).join("");
  }

  function loadNotifications(rerender) {
    fetch("/api/notifications").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      notifData = j.notifications || [];
      var btn = document.getElementById("notifBtn");
      if (btn) {
        var old = btn.querySelector(".notif-badge");
        if (old) old.remove();
        if (j.unread > 0) {
          var b = document.createElement("span");
          b.className = "notif-badge";
          b.textContent = j.unread > 9 ? "9+" : j.unread;
          btn.appendChild(b);
        }
      }
      if (rerender || (document.getElementById("notifPanel") && document.getElementById("notifPanel").classList.contains("open"))) {
        renderNotifList(notifData);
      }
    });
  }

  fetch("/api/auth/me").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    window.korabiUser = j ? j.user : null;
    renderAuth(window.korabiUser);
    document.dispatchEvent(new CustomEvent("korabi-auth", { detail: { user: window.korabiUser } }));
  }).catch(function () {
    window.korabiUser = null;
    renderAuth(null);
  });
})();
