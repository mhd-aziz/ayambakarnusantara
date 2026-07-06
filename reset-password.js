/**
 * Script untuk mereset password user via Firebase Admin SDK
 * Jalankan dari folder backend-ayambakarnusantara:
 *   node reset-password.js <email> <password-baru>
 *
 * Contoh:
 *   node reset-password.js user@gmail.com password123
 */

require("dotenv").config();
const path = require("path");
const admin = require("firebase-admin");

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("❌ Usage: node reset-password.js <email> <password-baru>");
  console.error("   Contoh: node reset-password.js user@gmail.com password123");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("❌ Password minimal 6 karakter.");
  process.exit(1);
}

const serviceAccountPath = path.resolve(
  process.cwd(),
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH
);
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

(async () => {
  try {
    console.log(`🔍 Mencari akun dengan email: ${email} ...`);
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`✅ Akun ditemukan: UID = ${userRecord.uid}`);

    await admin.auth().updateUser(userRecord.uid, { password: newPassword });
    console.log(`✅ Password berhasil diubah menjadi: "${newPassword}"`);
    console.log(`\n🎉 Sekarang Anda bisa login dengan:`);
    console.log(`   Email    : ${email}`);
    console.log(`   Password : ${newPassword}`);
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      console.error(`❌ Email "${email}" tidak terdaftar di Firebase.`);
    } else {
      console.error("❌ Gagal reset password:", error.message);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
})();
