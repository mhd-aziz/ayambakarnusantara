const { Resend } = require("resend");

const resendApiKey = process.env.RESEND_API_KEY;
const resendFromEmail =
  process.env.RESEND_FROM_EMAIL || "no-reply@zisaltech.site";

if (!resendApiKey) {
  console.error(
    "RESEND_API_KEY belum diset di .env — fitur email (reset password) tidak dapat berfungsi."
  );
  process.exit(1);
}

const resend = new Resend(resendApiKey);

console.log(`Resend initialized (sender: ${resendFromEmail}).`);

module.exports = { resend, resendFromEmail };
