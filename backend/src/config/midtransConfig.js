require("dotenv").config();

// CATATAN KEAMANAN: jangan pernah mencetak MIDTRANS_SERVER_KEY /
// MIDTRANS_CLIENT_KEY ke log (sekalipun sebagian) — ROADMAP #12.
const midtransClient = require("midtrans-client");

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

module.exports = snap;
