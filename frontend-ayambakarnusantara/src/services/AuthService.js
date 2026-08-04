import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, userData, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mendaftar.",
      }
    );
  }
};

const loginUser = async (credentials) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, credentials, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat login.",
      }
    );
  }
};

const forgotPassword = async (emailData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/forgot-password`,
      emailData
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          "Terjadi kesalahan pada server saat memproses permintaan lupa password.",
      }
    );
  }
};

const logoutUser = async () => {
  try {
    const response = await axios.post(
      `${BASE_URL}/auth/logout`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        status: "error",
        statusCode: error.response?.status || 500,
        message: "Terjadi kesalahan pada server saat logout.",
      }
    );
  }
};


export { registerUser, loginUser, forgotPassword, logoutUser};
