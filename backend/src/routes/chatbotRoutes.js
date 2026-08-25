const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbotController");
const { authenticateToken } = require("../middlewares/authMiddleware");
const { createRateLimiter } = require("../middlewares/rateLimiter");

// Chatbot proxies a paid LLM endpoint with a long timeout — cap request rate
// to bound cost (REVIEW-2026-08-25 H3).
const askLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  message: "Terlalu banyak permintaan chatbot. Silakan coba lagi sebentar.",
});

router.post("/ask", authenticateToken, askLimiter, chatbotController.forwardToChatbot);

router.get("/history", authenticateToken, chatbotController.getChatHistory);

router.delete(
  "/history/clear",
  authenticateToken,
  chatbotController.clearChatHistory
);

module.exports = router;
