const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { createRateLimiter } = require("../middlewares/rateLimiter");

// Form feedback publik -> batasi spam: 10 kiriman / 10 menit per IP (E2E + spam guard)
const feedbackLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message:
    "Terlalu banyak feedback terkirim dari perangkat ini. Silakan coba lagi dalam beberapa menit.",
});

router.post("/", feedbackLimiter, feedbackController.createFeedback);

module.exports = router;
