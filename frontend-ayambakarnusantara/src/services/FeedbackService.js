// src/services/FeedbackService.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

const sendFeedback = async (feedbackData) => {
  if (
    !feedbackData ||
    !feedbackData.name ||
    !feedbackData.email ||
    !feedbackData.subject ||
    !feedbackData.message
  ) {
    const err = new Error("Nama, email, subjek, dan pesan wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await axios.post(`${BASE_URL}/feedback`, feedbackData, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mengirim feedback.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

export { sendFeedback };
