const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { createRateLimiter } = require("../middlewares/rateLimiter");

// Protect brute-force / email-bombing vectors (REVIEW-2026-08-25 H3).
// Lewati saat testing (NODE_ENV === "test") agar tidak memicu 429 pada integration test suite.
const rawLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Terlalu banyak percobaan login. Silakan coba lagi 15 menit lagi.",
});
const rawSensitiveActionLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
});

const loginLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === "test") return next();
  return rawLoginLimiter(req, res, next);
};

const sensitiveActionLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === "test") return next();
  return rawSensitiveActionLimiter(req, res, next);
};

router.post("/register", sensitiveActionLimiter, authController.register);
router.post("/login", loginLimiter, authController.login);
router.post("/logout", authController.logout);
router.post("/forgot-password", sensitiveActionLimiter, authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.delete("/account/delete", authenticateToken, authController.deleteUser);

module.exports = router;
