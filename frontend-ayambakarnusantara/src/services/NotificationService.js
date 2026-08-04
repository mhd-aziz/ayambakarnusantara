import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";
const NOTIFICATION_API_URL = `${BASE_URL}/notification`;

/**
 * Mengambil semua notifikasi untuk pengguna yang sedang login.
 * @returns {Promise<object>} Respons dari API berisi daftar notifikasi.
 */
const getMyNotifications = async () => {
  try {
    const response = await axios.get(NOTIFICATION_API_URL, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mengambil notifikasi.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

/**
 * Menandai notifikasi sebagai telah dibaca.
 * @param {string} notificationId - ID dari notifikasi yang akan ditandai.
 * @returns {Promise<object>} Respons dari API.
 */
const markNotificationAsRead = async (notificationId) => {
  if (!notificationId) {
    const err = new Error("notificationId wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await axios.patch(
      `${NOTIFICATION_API_URL}/${notificationId}/read`,
      {}, // Body kosong
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat menandai notifikasi.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

export { getMyNotifications, markNotificationAsRead };
