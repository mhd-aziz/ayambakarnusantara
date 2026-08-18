const { supabaseAdmin, supabaseAnon } = require("../config/supabaseConfig");
const { resend, resendFromEmail } = require("../config/resendConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const {
  deleteFile,
  extractPathFromPublicUrl,
} = require("../utils/storageHelper");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
};
const refreshCookieOptions = {
  ...cookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
};

function setSessionCookies(res, session) {
  res.cookie("authToken", session.access_token, cookieOptions);
  res.cookie("authRefreshToken", session.refresh_token, refreshCookieOptions);
}

function clearSessionCookies(res) {
  res.cookie("authToken", "", { ...cookieOptions, expires: new Date(0) });
  res.cookie("authRefreshToken", "", {
    ...refreshCookieOptions,
    expires: new Date(0),
  });
}

exports.register = async (req, res) => {
  const { email, password, displayName, phoneNumber, address } = req.body;

  if (!email || !password || !displayName) {
    return handleError(res, {
      statusCode: 400,
      message: "Email, password, dan nama lengkap wajib diisi.",
    });
  }
  if (password.length < 6) {
    return handleError(res, {
      statusCode: 400,
      message: "Password minimal 6 karakter.",
    });
  }
  if (phoneNumber && phoneNumber.trim() !== "" && !phoneNumber.startsWith("+")) {
    return handleError(res, {
      statusCode: 400,
      message: "Nomor telepon harus diawali dengan kode negara.",
    });
  }

  try {
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // langsung aktif & dapat sesi (perilaku sama seperti sebelumnya)
        user_metadata: { display_name: displayName },
      });

    if (createError) throw createError;

    const uid = created.user.id;

    // Profil dibuat otomatis oleh trigger on_auth_user_created;
    // lengkapi nomor telepon & alamat.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        phone_number: phoneNumber && phoneNumber.trim() !== "" ? phoneNumber : null,
        address: address || null,
      })
      .eq("id", uid);

    if (profileError) {
      console.error("Gagal melengkapi profil setelah registrasi:", profileError.message);
    }

    // Buat sesi langsung (mirip perilaku lama: langsung dapat cookie)
    const { data: sessionData, error: signInError } =
      await supabaseAnon.auth.signInWithPassword({ email, password });

    if (signInError) {
      console.error(
        "Gagal mendapatkan sesi setelah registrasi:",
        signInError.message
      );
      await supabaseAdmin.auth.admin
        .deleteUser(uid)
        .catch((delErr) => console.error("Gagal menghapus user:", delErr.message));
      return handleError(
        res,
        signInError,
        "Registrasi berhasil, namun gagal mendapatkan sesi. Silakan coba login."
      );
    }

    setSessionCookies(res, sessionData.session);

    return handleSuccess(
      res,
      201,
      "Pendaftaran berhasil. Sesi Anda telah dibuat.",
      {
        uid,
        email: created.user.email,
        displayName: created.user.user_metadata?.display_name || displayName,
      }
    );
  } catch (error) {
    console.error("Registration Process Error:", error);
    return handleError(
      res,
      error,
      "Pendaftaran gagal. Terjadi kesalahan internal."
    );
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return handleError(res, {
      statusCode: 400,
      message: "Email dan password wajib diisi.",
    });
  }

  try {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    const uid = data.user.id;

    const { data: userData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (profileError) throw profileError;

    if (!userData) {
      console.warn(`Data pengguna tidak ditemukan di profiles untuk UID: ${uid}`);
      return handleError(res, {
        statusCode: 401,
        message: "Email atau password salah, atau data pengguna tidak lengkap.",
      });
    }

    setSessionCookies(res, data.session);

    return handleSuccess(res, 200, "Login berhasil! Sesi Anda telah dibuat.", {
      user: {
        uid: userData.id,
        email: userData.email,
        displayName: userData.display_name,
        phoneNumber: userData.phone_number,
        address: userData.address,
        photoURL: userData.photo_url,
        role: userData.role,
        createdAt: userData.created_at,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return handleError(res, error, "Login gagal.");
  }
};

exports.logout = (req, res) => {
  try {
    clearSessionCookies(res);
    return handleSuccess(res, 200, "Logout berhasil.");
  } catch (error) {
    console.error("Logout Error:", error);
    return handleError(res, error, "Logout gagal. Terjadi kesalahan server.");
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return handleError(res, { statusCode: 400, message: "Email wajib diisi." });
  }

  try {
    // Cek keberadaan user + buat OTP recovery via generateLink (admin).
    // generateLink TIDAK mengirim email; ia hanya menghasilkan email_otp
    // yang valid untuk dipertukarkan menjadi sesi via verifyOtp.
    let linkData = null;
    try {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });
      if (error) throw error;
      linkData = data;
    } catch (findErr) {
      console.log(
        `Permintaan reset password untuk ${email}: pencarian {terdaftar:${
          linkData ? "true" : "false"
        } / error:${findErr?.message}}`
      );
    }

    const otp = linkData?.properties?.email_otp;
    const isRegistered = Boolean(linkData?.user && otp);

    // Anti-enumeration: balas 200 dengan pesan netral yang SAMA untuk email
    // terdaftar maupun tidak, supaya penyerang tidak bisa memetakan akun dari
    // isi respons. Jeda kecil di jalur tidak-terdaftar meratakan timing (jalur
    // terdaftar lebih lambat karena benar-benar mengirim email via Resend).
    if (!isRegistered) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return handleSuccess(
        res,
        200,
        "Jika email Anda terdaftar, tautan reset password telah dikirim."
      );
    }

    // Tukar OTP recovery menjadi sesi (access_token + refresh_token) di sisi
    // backend. verifyOtp TIDAK memakai halaman /auth/v1/verify Supabase, jadi
    // tidak bergantung pada require SubAuth redirect URL/allowlist yang
    // menolak redirectTo ber-IP mentah.
    const { data: sessionData, error: sessionError } =
      await supabaseAnon.auth.verifyOtp({
        type: "recovery",
        email,
        token: otp,
      });
    if (sessionError || !sessionData?.session) {
      console.error(
        "forgotPassword: tukar OTP ke sesi gagal:",
        sessionError?.message || "sesi kosong"
      );
      throw sessionError || new Error("Sesi recovery kosong.");
    }

    // Redirect tautan ke origin yang sedang dipakai user (header Origin) bila
    // terdaftar di CORS_ALLOWED_ORIGINS; fallback ke origin pertama.
    const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    const requestOrigin = req.get("origin") || "";
    const frontendUrl = allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : allowedOrigins[0] || "http://localhost:5173";

    const resetLink =
      `${frontendUrl}/reset-password` +
      `#access_token=${sessionData.session.access_token}` +
      `&refresh_token=${sessionData.session.refresh_token}` +
      `&type=recovery`;

    // Kirim email secara langsung melalui Resend (bukan via Supabase).
    const { error: mailError } = await resend.emails.send({
      from: `Ayam Bakar Nusantara <${resendFromEmail}>`,
      to: [email],
      subject: "Atur Ulang Password — Ayam Bakar Nusantara",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
          <h2 style="color:#C07722">Atur Ulang Password</h2>
          <p>Halo,</p>
          <p>Kami menerima permintaan untuk mengatur ulang password akun Anda.
             Klik tombol di bawah untuk membuat password baru:</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${resetLink}"
               style="display:inline-block;background:#C07722;color:#fff;
                      text-decoration:none;padding:12px 26px;border-radius:6px;
                      font-weight:bold">Atur Ulang Password</a>
          </p>
          <p>Jika tombol tidak berfungsi, salin tautan ini ke browser:</p>
          <p style="word-break:break-all;color:#666;font-size:13px">${resetLink}</p>
          <p style="color:#999;font-size:12px">Abaikan email ini jika bukan Anda
             yang memintanya. Tautan berlaku sementara dan aman.</p>
        </div>
      `,
    });
    if (mailError) throw mailError;

    return handleSuccess(
      res,
      200,
      "Jika email Anda terdaftar, tautan reset password telah dikirim."
    );
  } catch (error) {
    console.error("Error in forgotPassword process:", error.code, error.message);
    return handleError(
      res,
      error,
      "Gagal memproses permintaan reset password."
    );
  }
};

exports.resetPassword = async (req, res) => {
  const { accessToken, refreshToken, newPassword } = req.body;

  if (!accessToken || !refreshToken) {
    return handleError(res, {
      statusCode: 400,
      message: "Tautan reset password tidak valid. Silakan minta tautan baru.",
    });
  }
  if (!newPassword) {
    return handleError(res, {
      statusCode: 400,
      message: "Password baru wajib diisi.",
    });
  }
  if (newPassword.length < 6) {
    return handleError(res, {
      statusCode: 400,
      message: "Password baru minimal 6 karakter.",
    });
  }

  try {
    // Token recovery dikirim Supabase lewat URL email (hash #access_token + refresh_token).
    // Bangun sesi dari token itu supaya updateUser berjalan atas nama pemilik email.
    const { data: sessionData, error: sessionError } =
      await supabaseAnon.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    if (sessionError || !sessionData?.user) {
      console.error(
        "resetPassword: sesi dari token recovery gagal dibuat:",
        sessionError?.message || "user tidak ditemukan"
      );
      return handleError(res, {
        statusCode: 400,
        message:
          "Tautan reset password tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.",
      });
    }

    const { error: updateError } = await supabaseAnon.auth.updateUser({
      password: newPassword,
    });
    if (updateError) throw updateError;

    // Bersihkan sesi reset; user login ulang dengan password baru.
    clearSessionCookies(res);

    return handleSuccess(
      res,
      200,
      "Password berhasil diubah. Silakan login dengan password baru Anda."
    );
  } catch (error) {
    console.error("Error in resetPassword process:", error.code, error.message);
    return handleError(
      res,
      error,
      "Gagal mengubah password. Silakan coba lagi atau minta tautan baru."
    );
  }
};

exports.deleteUser = async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan untuk menghapus akun.",
    });
  }

  console.log(`[PENGHAPUSAN AKUN] Memulai proses untuk UID: ${uid}`);

  try {
    // 1. Ambil profil (kalau ada)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    if (profileError) throw profileError;

    const deletionTasks = [];

    // 2. Hapus file storage milik user
    if (profile?.photo_url) {
      const path = extractPathFromPublicUrl(profile.photo_url, "profile-images");
      if (path) deletionTasks.push(deleteFile("profile-images", path));
    }

    // 3. Jika seller: hapus gambar produk + banner toko
    //    (baris shops/products/ratings/orders terhapus otomatis via FK CASCADE)
    if (profile?.role === "seller" && profile?.shop_id) {
      const { data: shop } = await supabaseAdmin
        .from("shops")
        .select("banner_image_url, id")
        .eq("id", profile.shop_id)
        .maybeSingle();

      if (shop?.banner_image_url) {
        const bannerPath = extractPathFromPublicUrl(
          shop.banner_image_url,
          "shop-banners"
        );
        if (bannerPath) deletionTasks.push(deleteFile("shop-banners", bannerPath));
      }

      const { data: products } = await supabaseAdmin
        .from("products")
        .select("product_image_url")
        .eq("shop_id", shop.id);

      if (products) {
        products.forEach((p) => {
          if (p.product_image_url) {
            const productPath = extractPathFromPublicUrl(
              p.product_image_url,
              "product-images"
            );
            if (productPath) deletionTasks.push(deleteFile("product-images", productPath));
          }
        });
      }
    }

    // 4. Hapus percakapan yang melibatkan user (messages ikut terhapus via CASCADE)
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .contains("participant_uids", [uid]);
    const conversationIds =
      conversations && conversations.length > 0
        ? conversations.map((c) => c.id)
        : [];

    if (conversationIds.length > 0) {
      deletionTasks.push(
        supabaseAdmin
          .from("conversations")
          .delete()
          .in("id", conversationIds)
      );

      // Foto chat disimpan di bucket PUBLIK "chat-images" → wajib dihapus manual
      // (T1 REVIEW-2026-08-17). Baris messages ikut terhapus via CASCADE, tapi
      // file storage-nya tidak — tanpa ini foto sensitif tetap terbuka di web.
      const { data: chatImageMessages } = await supabaseAdmin
        .from("messages")
        .select("image_url")
        .eq("type", "image")
        .in("conversation_id", conversationIds);
      if (chatImageMessages) {
        chatImageMessages.forEach((m) => {
          if (m.image_url) {
            const path = extractPathFromPublicUrl(m.image_url, "chat-images");
            if (path) deletionTasks.push(deleteFile("chat-images", path));
          }
        });
      }
    }

    // Bukti bayar ("orders" bucket privat) — baris order user ikut terhapus via
    // CASCADE, tapi file proof (path relatif di payment_details.proofImageURLs)
    // tidak ikut. Hapus manual supaya data sensitif tak tersisa di storage
    // (T1 REVIEW-2026-08-17). Path http adalah URL publik lama (Firebase) — tak
    // bisa dihapus via Supabase storage, dilewati.
    const { data: userOrders } = await supabaseAdmin
      .from("orders")
      .select("payment_details")
      .eq("user_id", uid);
    if (userOrders) {
      userOrders.forEach((o) => {
        const proofs = o.payment_details?.proofImageURLs || [];
        proofs.forEach((proofPath) => {
          if (
            typeof proofPath === "string" &&
            proofPath.length > 0 &&
            !proofPath.startsWith("http")
          ) {
            deletionTasks.push(deleteFile("orders", proofPath));
          }
        });
      });
    }

    await Promise.all(deletionTasks);
    console.log(
      `[PENGHAPUSAN AKUN] Semua data terkait (DB + Storage) untuk UID: ${uid} telah dihapus.`
    );

    // 5. Hapus akun auth (profiles + semua baris FK CASCADE ikut terhapus)
    await supabaseAdmin.auth.admin.deleteUser(uid);
    console.log(`[PENGHAPUSAN AKUN] Akun auth UID: ${uid} telah dihapus.`);

    clearSessionCookies(res);

    console.log(`[PENGHAPUSAN AKUN] Proses untuk UID: ${uid} BERHASIL.`);
    return handleSuccess(
      res,
      200,
      "Akun Anda dan semua data terkait telah berhasil dihapus secara permanen."
    );
  } catch (error) {
    console.error(
      `[PENGHAPUSAN AKUN] GAGAL saat memproses UID: ${uid}:`,
      error
    );
    return handleError(res, error, "Gagal menghapus akun secara lengkap.");
  }
};
