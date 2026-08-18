exports.handleSuccess = (res, statusCode, message, data = null) => {
  const responsePayload = { success: true, message };
  if (data !== null) {
    responsePayload.data = data;
  }
  return res.status(statusCode).json(responsePayload);
};

exports.handleError = (
  res,
  error,
  defaultMessage = "Terjadi kesalahan pada server."
) => {
  console.error(
    `Error Handler: Message: "${error.message}"`,
    error.code ? `Error Code: ${error.code}` : "",
    error.statusCode ? `Custom Status: ${error.statusCode}` : "",
    error.errorCode ? `Custom ErrorCode: ${error.errorCode}` : ""
  );
  if (
    process.env.NODE_ENV !== "production" &&
    error instanceof Error &&
    !error.code &&
    !error.statusCode &&
    error.stack
  ) {
    console.error("Stack Trace:", error.stack);
  }

  let statusCode = 500;
  let message = defaultMessage;

  if (error.code) {
    switch (error.code) {
      case "auth/email-already-exists":
      case "auth/email-already-in-use":
      case "email_exists":
      case "user_already_exists":
        statusCode = 400;
        message = "Email sudah terdaftar.";
        break;
      case "auth/invalid-email":
      case "invalid_email":
        statusCode = 400;
        message = "Format email tidak valid.";
        break;
      case "auth/weak-password":
      case "weak_password":
        statusCode = 400;
        message = "Password terlalu lemah. Minimal 6 karakter.";
        break;
      case "auth/user-not-found":
      case "user_not_found":
        statusCode = 404;
        message = "Pengguna tidak ditemukan.";
        break;
      case "auth/invalid-credential":
      case "invalid_credentials":
        statusCode = 401;
        message = "Kredensial tidak valid atau autentikasi gagal.";
        break;
      case "email_not_confirmed":
        statusCode = 400;
        message = "Email belum dikonfirmasi.";
        break;
      case "over_email_send_rate_limit":
        statusCode = 429;
        message = "Terlalu banyak permintaan email. Silakan coba lagi nanti.";
        break;
      case "auth/invalid-phone-number":
        statusCode = 400;
        message =
          "Nomor telepon tidak valid. Pastikan formatnya benar (misal: +628****7890).";
        break;
      case "auth/phone-number-already-exists":
        statusCode = 400;
        message = "Nomor telepon sudah digunakan oleh akun lain.";
        break;
      case "auth/id-token-expired":
      case "JWT expired":
        statusCode = 401;
        message = "Sesi Anda telah berakhir. Silakan login kembali.";
        break;
      case "auth/id-token-revoked":
        statusCode = 401;
        message =
          "Sesi Anda tidak valid lagi atau telah dicabut. Silakan login kembali.";
        break;
      case "auth/argument-error":
      case "auth/invalid-id-token":
        statusCode = 401;
        message = "Token autentikasi tidak valid atau formatnya salah.";
        break;
      default:
        if (error.message && error.message.includes("E.164")) {
          statusCode = 400;
          message =
            "Nomor telepon harus dalam format E.164 (contoh: +6281234567890).";
        } else if (error.message) {
          message = error.message;
        }
    }
  } else if (error.isJoi) {
    statusCode = 400;
    message = error.details.map((detail) => detail.message).join(", ");
  } else if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message || defaultMessage;
  }

  return res.status(statusCode).json({ success: false, message });
};
