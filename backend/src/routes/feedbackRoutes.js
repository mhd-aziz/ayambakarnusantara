const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { createRateLimiter } = require("../middlewares/rateLimiter");

// Form feedback publik -> batasi spam: maksimal 5 kiriman per 10 menit per IP
const feedbackLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message:
    "Terlalu banyak feedback terkirim dari perangkat ini. Silakan coba lagi dalam beberapa menit.",
});

router.post("/", feedbackLimiter, feedbackController.createFeedback);

module.exports = router;
