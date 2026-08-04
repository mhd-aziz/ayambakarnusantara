// src/services/ChatService.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";
const CHAT_API_URL = `${BASE_URL}/chat`;
const CHATBOT_API_URL = `${BASE_URL}/chatbot`;

const startOrGetConversation = async (recipientUID) => {
  if (!recipientUID || typeof recipientUID !== "string") {
    const err = new Error("recipientUID (string) wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.post(
      `${CHAT_API_URL}/conversations`,
      { recipientUID },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          "Terjadi kesalahan pada server saat memulai atau mendapatkan percakapan.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const getAllConversations = async () => {
  try {
    const response = await axios.get(`${CHAT_API_URL}/conversations`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          "Terjadi kesalahan pada server saat mengambil daftar percakapan.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const sendMessage = async (conversationId, messageData) => {
  if (!conversationId || typeof conversationId !== "string") {
    const err = new Error("conversationId (string) wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }

  const hasText =
    messageData.text &&
    typeof messageData.text === "string" &&
    messageData.text.trim() !== "";
  const hasImage = messageData.image instanceof File;
  const hasLocation =
    messageData.location &&
    typeof messageData.location.latitude === "number" &&
    typeof messageData.location.longitude === "number";

  if (!hasText && !hasImage && !hasLocation) {
    const err = new Error("Pesan harus berisi teks, gambar, atau lokasi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }

  let requestBody;
  const config = {
    withCredentials: true,
  };

  if (hasImage) {
    requestBody = new FormData();
    requestBody.append("chatImage", messageData.image);
    if (hasText) {
      requestBody.append("text", messageData.text.trim());
    }
    config.headers = {
      "Content-Type": "multipart/form-data",
    };
  } else {
    if (hasLocation) {
      requestBody = {
        latitude: messageData.location.latitude,
        longitude: messageData.location.longitude,
      };
    } else {
      requestBody = { text: messageData.text.trim() };
    }
  }

  try {
    const response = await axios.post(
      `${CHAT_API_URL}/conversations/${conversationId}/messages`,
      requestBody,
      config
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mengirim pesan.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const getMessages = async (conversationId, queryParams = {}) => {
  if (!conversationId || typeof conversationId !== "string") {
    const err = new Error("conversationId (string) wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.get(
      `${CHAT_API_URL}/conversations/${conversationId}/messages`,
      {
        params: queryParams,
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          "Terjadi kesalahan pada server saat mengambil pesan percakapan.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const askChatbot = async (data) => {
  if (!data || !data.question || !data.userId) {
    const err = new Error(
      "Question (string) and userId (string) are required."
    );
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  const requestBody = {
    message: data.question,
  };

  try {
    const response = await axios.post(`${CHATBOT_API_URL}/ask`, requestBody, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat menghubungi chatbot.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const getChatbotHistory = async (userId) => {
  if (!userId || typeof userId !== "string") {
    const err = new Error(
      "userId (string) wajib diisi untuk mengambil riwayat chatbot."
    );
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.get(`${CHATBOT_API_URL}/history`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          "Terjadi kesalahan pada server saat mengambil riwayat chatbot.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

export {
  startOrGetConversation,
  getAllConversations,
  sendMessage,
  getMessages,
  askChatbot,
  getChatbotHistory,
};
