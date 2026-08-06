const { supabaseAdmin, supabaseAnon } = require("../config/supabaseConfig");
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
    // Cek keberadaan user tanpa membocorkan informasi ke peminta
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(
      email
    );
    if (!existingUser?.user) {
      console.log(`Permintaan reset password untuk email tidak terdaftar: ${email}`);
      return handleSuccess(
        res,
        200,
        `Jika email ${email} terdaftar, tautan reset password telah dikirim.`
      );
    }

    // Supabase mengirim email recovery otomatis (template bawaan dashboard)
    const frontendUrl =
      (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173")
        .split(",")[0]
        .trim() || "http://localhost:5173";

    const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/reset-password`,
    });
    if (error) throw error;

    return handleSuccess(
      res,
      200,
      `Tautan reset password telah dikirim ke ${email}.`
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
    if (conversations && conversations.length > 0) {
      deletionTasks.push(
        supabaseAdmin
          .from("conversations")
          .delete()
          .in(
            "id",
            conversations.map((c) => c.id)
          )
      );
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
