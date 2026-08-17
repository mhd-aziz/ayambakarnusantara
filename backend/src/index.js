// Entry server — hanya memuat app dan mendengarkan port.
// Konfigurasi Express ada di src/app.js (agar bisa dites dengan supertest).
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const app = require("./app");

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(
    `Server Ayam Bakar Nusantara berjalan di http://localhost:${port}`
  );
});