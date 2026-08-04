const { supabaseAdmin, supabaseAnon } = require("../config/supabaseConfig");
const { handleError } = require("../utils/responseHandler");

const isProduction = process.env.NODE_ENV === "production";

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",
  maxAge: 24 * 60 * 60 * 1000, // 24 jam (token di dalamnya berlaku 1 jam, di-refresh otomatis)
  path: "/",
};

const refreshCookieOptions = {
  ...authCookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
};

function clearAuthCookies(res) {
  const expired = { ...authCookieOptions, expires: new Date(0) };
  res.cookie("authToken", "", expired);
  res.cookie("authRefreshToken", "", { ...expired, maxAge: undefined });
}

function normalizeUser(user) {
  return {
    uid: user.id,
    email: user.email,
    displayName:
      user.user_metadata?.display_name || (user.email ? user.email.split("@")[0] : null),
    phoneNumber: user.phone || null,
    role: user.user_metadata?.role || "customer",
    emailVerified: Boolean(user.email_confirmed_at),
    raw: user,
  };
}

function isJwtExpiredError(error) {
  const msg = (error && (error.message || error.error_description || "")) || "";
  return msg.includes("JWT expired") || msg.includes("Token has expired");
}

exports.authenticateToken = async (req, res, next) => {
  let token = null;

  if (req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split("Bearer ")[1];
    }
  }

  if (!token) {
    return handleError(res, {
      statusCode: 401,
      message: "Akses ditolak. Token tidak disertakan.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      throw error || new Error("Pengguna tidak ditemukan untuk token ini.");
    }
    req.user = normalizeUser(data.user);
    req.supabaseAccessToken = token;
    return next();
  } catch (error) {
    // Access token kedaluwarsa: coba perpanjang via refresh token (cookie)
    if (isJwtExpiredError(error)) {
      const refreshToken = req.cookies && req.cookies.authRefreshToken;
      if (refreshToken) {
        try {
          const { data: refreshData, error: refreshError } =
            await supabaseAnon.auth.refreshSession({
              refresh_token: refreshToken,
            });
          if (!refreshError && refreshData?.session) {
            res.cookie("authToken", refreshData.session.access_token, authCookieOptions);
            res.cookie(
              "authRefreshToken",
              refreshData.session.refresh_token,
              refreshCookieOptions
            );
            const { data: userData } = await supabaseAdmin.auth.getUser(
              refreshData.session.access_token
            );
            req.user = normalizeUser(userData.user);
            req.supabaseAccessToken = refreshData.session.access_token;
            return next();
          }
        } catch (refreshErr) {
          console.error("Auto-refresh gagal:", refreshErr.message);
        }
      }
      clearAuthCookies(res);
      return handleError(res, {
        statusCode: 401,
        message: "Sesi Anda telah berakhir. Silakan login kembali.",
        errorCode: "TOKEN_EXPIRED",
      });
    }

    clearAuthCookies(res);
    console.error("Error verifying token:", error.message);
    return handleError(res, {
      statusCode: 401,
      message: "Akses ditolak. Token tidak valid.",
      errorCode: "TOKEN_INVALID",
    });
  }
};

exports.isSeller = async (req, res, next) => {
  if (!req.user || !req.user.uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan untuk verifikasi peran.",
    });
  }

  const uid = req.user.uid;

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return handleError(res, {
        statusCode: 404,
        message: "Data pengguna tidak ditemukan untuk verifikasi peran.",
      });
    }

    if (data.role === "seller") {
      next();
    } else {
      return handleError(res, {
        statusCode: 403,
        message: "Akses ditolak. Peran 'seller' diperlukan.",
      });
    }
  } catch (error) {
    console.error("Error in isSeller middleware:", error);
    return handleError(
      res,
      error,
      "Gagal melakukan otorisasi peran seller karena kesalahan server."
    );
  }
};
