// src/app.js — Aplikasi Express (tanpa listen).
// Dipisah dari index.js agar bisa dites dengan supertest (M4).
// index.js cukup memuat app ini lalu app.listen.
const path = require("path");
// Load env: .env (base/fallback) lalu .env.dev (developer) atau .env.prod (produksi).
// Pilihan file ditentukan NODE_ENV: 'production' → .env.prod, selain itu → .env.dev.
// `override: true` membuat nilai di file spesifik-environment menang atas .env.
const envDir = path.join(__dirname, "..");
require("dotenv").config({ path: path.join(envDir, ".env") });
const envFile =
  process.env.NODE_ENV === "production" ? ".env.prod" : ".env.dev";
require("dotenv").config({
  path: path.join(envDir, envFile),
  override: true,
});
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const shopRoutes = require("./routes/shopRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const chatRoutes = require("./routes/chatRoutes");
const notificationsRoutes = require("./routes/notificationRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
require("./config/supabaseConfig");

const { handleError } = require("./utils/responseHandler");
const app = express();

const allowedOriginsString =
  process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000";

const allowedOrigins = allowedOriginsString
  .split(",")
  .map((origin) => origin.trim());

console.log("Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.error(`Akses CORS ditolak untuk origin: ${origin}`);
        callback(
          new Error(
            `Kebijakan CORS untuk situs ini tidak mengizinkan akses dari Origin: ${origin}`
          ),
          false
        );
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("Selamat datang di API Ayam Bakar Nusantara!");
});

app.use("/auth", authRoutes);
app.use("/profile", profileRoutes);
app.use("/shop", shopRoutes);
app.use("/product", productRoutes);
app.use("/cart", cartRoutes);
app.use("/order", orderRoutes);
app.use("/payment", paymentRoutes);
app.use("/rating", ratingRoutes);
app.use("/chatbot", chatbotRoutes);
app.use("/chat", chatRoutes);
app.use("/notification", notificationsRoutes);
app.use("/feedback", feedbackRoutes);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof multer.MulterError) {
    let message = `Kesalahan unggah file: ${err.message}.`;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Ukuran file terlalu besar dari batas yang diizinkan.";
    } else if (err.code === "LIMIT_FILE_COUNT") {
      message = "Jumlah file yang diunggah melebihi batas.";
    } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
      message = `Jenis file tidak terduga atau nama field salah. Field: ${
        err.field || "tidak diketahui"
      }.`;
    }
    return handleError(res, { statusCode: 400, message });
  }

  return handleError(res, err, "Terjadi kesalahan tidak terduga pada server.");
});

module.exports = app;