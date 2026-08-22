const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticateToken } = require("../middlewares/authMiddleware");

router.post(
  "/charge/:orderId",
  authenticateToken,
  paymentController.createMidtransTransaction
);

router.post(
  "/retry/:orderId", 
  authenticateToken,
  paymentController.retryMidtransPayment
);

router.get(
  "/status/:orderId",
  authenticateToken,
  paymentController.getMidtransTransactionStatus
);

// Webhook Midtrans (payment notification) — dipanggil server Midtrans, TANPA auth
router.post(
  "/notification",
  paymentController.handlePaymentNotification
);

// Refund (seller/admin) — ROADMAP #16
router.post(
  "/refund",
  authenticateToken,
  paymentController.refundPayment
);

// Payment audit trail — ROADMAP #16
router.get(
  "/audit/:orderId",
  authenticateToken,
  paymentController.getPaymentAudit
);

module.exports = router;
