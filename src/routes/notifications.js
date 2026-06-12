const router = require("express").Router();
const store = require("../db/store");
const { requireAuth } = require("../middleware/auth");
const { verifyCsrf } = require("../middleware/csrf");

router.get("/", requireAuth, (req, res) => {
  const mine = store.notifications.all().filter((n) => n.userId === req.user.id);
  mine.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json({
    notifications: mine,
    unread: mine.filter((n) => !n.read).length,
  });
});

router.post("/read-all", requireAuth, verifyCsrf, (req, res) => {
  store.notifications.all().forEach((n) => {
    if (n.userId === req.user.id && !n.read) {
      store.notifications.update((x) => x.id === n.id, { read: true });
    }
  });
  res.json({ ok: true });
});

module.exports = router;
