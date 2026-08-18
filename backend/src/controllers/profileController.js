const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const { v4: uuidv4 } = require("uuid");
const {
  uploadImage,
  deleteFile,
  extractPathFromPublicUrl,
} = require("../utils/storageHelper");

function mapProfile(row) {
  return {
    uid: row.id,
    email: row.email,
    displayName: row.display_name,
    photoURL: row.photo_url,
    phoneNumber: row.phone_number,
    address: row.address,
    role: row.role,
    shopId: row.shop_id,
    createdAt: row.created_at,
  };
}

exports.getProfile = async (req, res) => {
  const uid = req.user?.uid;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan untuk melihat profil.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return handleError(res, {
        statusCode: 404,
        message: "Profil pengguna tidak ditemukan.",
      });
    }
    return handleSuccess(res, 200, "Profil berhasil diambil.", mapProfile(data));
  } catch (error) {
    console.error("Error getting user profile:", error);
    return handleError(res, error, "Gagal mengambil profil pengguna.");
  }
};

exports.updateProfile = async (req, res) => {
  const uid = req.user?.uid;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan untuk memperbarui profil.",
    });
  }

  try {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!current) {
      return handleError(res, {
        statusCode: 404,
        message: "Profil pengguna tidak ditemukan.",
      });
    }

    const updates = {};
    const authMetaUpdates = {};

    const { displayName, phoneNumber, address, removeProfilePhoto } = req.body;
    if (displayName) {
      updates.display_name = displayName;
      authMetaUpdates.display_name = displayName;
    }
    if (phoneNumber) updates.phone_number = phoneNumber;
    if (address) updates.address = address;

    if (req.file) {
      const oldPhotoURL = current.photo_url;
      if (oldPhotoURL) {
        const oldPath = extractPathFromPublicUrl(oldPhotoURL, "profile-images");
        if (oldPath) await deleteFile("profile-images", oldPath);
      }

      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `profile-images/${uid}/${uuidv4()}.${fileExtension}`;
      updates.photo_url = await uploadImage(
        "profile-images",
        fileName,
        req.file.buffer,
        req.file.mimetype
      );
    } else if (removeProfilePhoto === "true") {
      const oldPhotoURL = current.photo_url;
      if (oldPhotoURL) {
        const oldPath = extractPathFromPublicUrl(oldPhotoURL, "profile-images");
        if (oldPath) await deleteFile("profile-images", oldPath);
      }
      updates.photo_url = null;
    }

    if (Object.keys(updates).length === 0) {
      return handleError(res, {
        statusCode: 400,
        message: "Tidak ada data yang dikirim untuk diperbarui.",
      });
    }

    // Sinkronkan nama tampilan ke metadata auth (dipakai sesi/chat)
    if (Object.keys(authMetaUpdates).length > 0) {
      const { error: metaError } =
        await supabaseAdmin.auth.admin.updateUserById(uid, {
          user_metadata: { ...(current.meta || {}), ...authMetaUpdates },
        });
      if (metaError) throw metaError;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", uid)
      .select()
      .single();

    if (updateError) throw updateError;

    return handleSuccess(
      res,
      200,
      "Profil berhasil diperbarui.",
      mapProfile(updated)
    );
  } catch (error) {
    console.error("Error in updateProfile:", error);
    if (error.message && error.message.includes("storage")) {
      return handleError(
        res,
        { statusCode: 500, message: "Gagal memproses file gambar." },
        "Kesalahan pada storage."
      );
    }
    return handleError(res, error, "Gagal memperbarui profil.");
  }
};

exports.deleteProfilePhoto = async (req, res) => {
  const uid = req.user?.uid;

  if (!uid) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan untuk menghapus foto profil.",
    });
  }

  try {
    const { data: current, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!current) {
      return handleError(res, {
        statusCode: 404,
        message: "Profil pengguna tidak ditemukan.",
      });
    }

    if (!current.photo_url) {
      return handleSuccess(res, 200, "Tidak ada foto profil untuk dihapus.");
    }

    const photoPath = extractPathFromPublicUrl(current.photo_url, "profile-images");
    if (photoPath) await deleteFile("profile-images", photoPath);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ photo_url: null })
      .eq("id", uid)
      .select()
      .single();

    if (updateError) throw updateError;

    return handleSuccess(
      res,
      200,
      "Foto profil berhasil dihapus.",
      mapProfile(updated)
    );
  } catch (error) {
    console.error("Error deleting profile photo:", error);
    return handleError(res, error, "Gagal menghapus foto profil.");
  }
};
