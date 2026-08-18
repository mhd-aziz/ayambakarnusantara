const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");

/**
 * Simpan notifikasi in-app ke database.
 * (Push native tidak dipakai lagi — Firebase sudah tidak aktif.
 *  Notifikasi muncul realtime via Supabase Realtime di frontend.)
 */
exports.sendNotification = async (notificationPayload) => {
  const { userId, title, body, data } = notificationPayload;

  try {
    const { error } = await supabaseAdmin.from("notifications").insert({
      user_id: userId,
      title,
      body,
      data: data || {},
    });

    if (error) {
      console.error(`Gagal menyimpan notifikasi untuk pengguna ${userId}:`, error.message);
    }
  } catch (error) {
    console.error(`Gagal mengirim notifikasi untuk pengguna ${userId}:`, error);
  }
};

exports.getUserNotifications = async (req, res) => {
  const userId = req.user?.uid;

  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;

    // Shape JSON sama seperti sebelumnya (Firestore style)
    const notifications = (data || []).map((n) => ({
      notificationId: n.id,
      userId: n.user_id,
      title: n.title,
      body: n.body,
      data: n.data || {},
      isRead: n.is_read,
      createdAt: n.created_at,
    }));

    return handleSuccess(
      res,
      200,
      "Notifikasi berhasil diambil.",
      notifications
    );
  } catch (error) {
    console.error("Error getting user notifications:", error);
    return handleError(res, error, "Gagal mengambil notifikasi.");
  }
};

exports.markNotificationAsRead = async (req, res) => {
  const userId = req.user?.uid;
  const { notificationId } = req.params;

  if (!notificationId) {
    return handleError(res, {
      statusCode: 400,
      message: "Notification ID diperlukan.",
    });
  }

  try {
    const { data: notif, error: fetchError } = await supabaseAdmin
      .from("notifications")
      .select("id, user_id")
      .eq("id", notificationId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!notif || notif.user_id !== userId) {
      return handleError(res, {
        statusCode: 404,
        message: "Notifikasi tidak ditemukan atau bukan milik Anda.",
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    if (updateError) throw updateError;

    return handleSuccess(res, 200, "Notifikasi ditandai sudah dibaca.");
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return handleError(res, error, "Gagal memperbarui notifikasi.");
  }
};
