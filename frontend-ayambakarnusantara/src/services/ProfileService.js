import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

const getProfile = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/profile/`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        status: "error",
        statusCode: error.response?.status || 500,
        message: "Terjadi kesalahan pada server saat mengambil profil.",
      }
    );
  }
};

const updateProfile = async (formData) => {
  try {
    const response = await axios.put(`${BASE_URL}/profile/update`, formData, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        status: "error",
        statusCode: error.response?.status || 500,
        message: "Terjadi kesalahan pada server saat memperbarui profil.",
      }
    );
  }
};

const registerFCMToken = async (tokenData) => {
  if (!tokenData || !tokenData.token) {
    const err = new Error("FCM token wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await axios.post(
      `${BASE_URL}/profile/fcm-token`,
      tokenData,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mendaftarkan FCM token.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const deleteAccount = async () => {
  try {
    const response = await axios.delete(`${BASE_URL}/auth/account/delete`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat menghapus akun.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

export { getProfile, updateProfile, registerFCMToken, deleteAccount };
