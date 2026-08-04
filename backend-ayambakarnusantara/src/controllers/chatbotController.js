const axios = require("axios");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const { supabaseAdmin } = require("../config/supabaseConfig");

const OMNIROUTE_API_URL =
  process.env.OMNIROUTE_API_URL || "https://omniroutelocal.zisaltech.site/v1/chat/completions";
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY || "";
const OMNIROUTE_MODEL = process.env.OMNIROUTE_MODEL || "auto/best-chat";

const SYSTEM_PROMPT =
  "Kamu adalah customer service Ayam Bakar Nusantara, marketplace multi-vendor " +
  "ayam bakar. Bantu pelanggan dengan ramah dalam Bahasa Indonesia. Kamu bisa menjawab " +
  "pertanyaan tentang produk, toko, cara pemesanan, pembayaran (online via Midtrans atau " +
  "bayar di tempat), status pesanan, dan lainnya. Jawab singkat, jelas, dan sopan.";

exports.forwardToChatbot = async (req, res) => {
  const { message: userMessageText, sender: senderIdFromFrontend } = req.body;

  if (
    !userMessageText ||
    typeof userMessageText !== "string" ||
    userMessageText.trim() === ""
  ) {
    return handleError(res, {
      statusCode: 400,
      message: "Pesan tidak boleh kosong.",
    });
  }

  const senderId = req.user?.uid || senderIdFromFrontend || "defaultUser";
  const userId = req.user?.uid;

  try {
    // Ambil riwayat singkat (maks 10 pesan) sebagai konteks percakapan
    let historyMessages = [];
    if (userId) {
      const { data: historyRow } = await supabaseAdmin
        .from("chat_histories")
        .select("chats")
        .eq("user_id", userId)
        .maybeSingle();

      if (historyRow?.chats && Array.isArray(historyRow.chats)) {
        historyMessages = historyRow.chats.slice(-10);
      }
    }

    const messagesForModel = [
      { role: "system", content: SYSTEM_PROMPT },
      ...historyMessages.map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: m.text || "",
      })),
      { role: "user", content: userMessageText },
    ];

    const omniRouteResponse = await axios.post(
      OMNIROUTE_API_URL,
      {
        model: OMNIROUTE_MODEL,
        messages: messagesForModel,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OMNIROUTE_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const botText =
      omniRouteResponse.data?.choices?.[0]?.message?.content ||
      omniRouteResponse.data?.choices?.[0]?.text ||
      "Maaf, saya tidak dapat menjawab saat ini.";

    const botMessageEntriesForDb = [{ role: "bot", text: botText }];

    if (userId) {
      const userMessageEntry = {
        role: "user",
        text: userMessageText,
        createdAt: new Date().toISOString(),
      };
      const newMessagesToAdd = [
        userMessageEntry,
        ...botMessageEntriesForDb.map((bm) => ({
          ...bm,
          createdAt: new Date().toISOString(),
        })),
      ];

      try {
        const { data: existingRow } = await supabaseAdmin
          .from("chat_histories")
          .select("chats")
          .eq("user_id", userId)
          .maybeSingle();

        const currentMessages =
          existingRow?.chats && Array.isArray(existingRow.chats)
            ? existingRow.chats
            : [];

        await supabaseAdmin.from("chat_histories").upsert(
          {
            user_id: userId,
            chats: [...currentMessages, ...newMessagesToAdd],
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      } catch (dbError) {
        console.error(
          "Gagal menyimpan atau memperbarui riwayat percakapan pengguna:",
          dbError
        );
      }
    }

    // Shape respons sama seperti Rasa: array objek {text, ...}
    const finalPayloadForClient = [{ text: botText }];

    return handleSuccess(
      res,
      200,
      "Pesan berhasil diproses.",
      finalPayloadForClient
    );
  } catch (error) {
    console.error(
      "Error saat berkomunikasi dengan OmniRoute:",
      error.response?.data || error.message
    );
    const statusCode = error.response?.status || 502;
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      "Gagal berkomunikasi dengan layanan chatbot.";

    if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      return handleError(res, {
        statusCode: 503,
        message: `Layanan chatbot (${OMNIROUTE_API_URL}) tidak dapat dijangkau.`,
      });
    }

    return handleError(res, {
      statusCode,
      message: errorMessage,
      errorDetails: error.response?.data,
    });
  }
};

exports.getChatHistory = async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Autentikasi diperlukan untuk melihat riwayat chat.",
    });
  }

  try {
    const { data: historyRow, error } = await supabaseAdmin
      .from("chat_histories")
      .select("chats")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    if (!historyRow?.chats || !Array.isArray(historyRow.chats)) {
      return handleSuccess(
        res,
        200,
        "Tidak ada riwayat percakapan ditemukan.",
        []
      );
    }

    let messages = historyRow.chats;
    if (messages.length > 20) {
      messages = messages.slice(-20);
    }

    return handleSuccess(
      res,
      200,
      "Riwayat percakapan berhasil diambil.",
      messages
    );
  } catch (error) {
    console.error("Error mengambil riwayat percakapan:", error);
    const errorMessage = error.message || "Gagal mengambil riwayat percakapan.";
    return handleError(res, {
      statusCode: 500,
      message: errorMessage,
      errorDetails: error,
    });
  }
};

exports.clearChatHistory = async (req, res) => {
  const userId = req.user?.uid;
  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Autentikasi diperlukan untuk menghapus riwayat chat.",
    });
  }

  try {
    const { error } = await supabaseAdmin
      .from("chat_histories")
      .delete()
      .eq("user_id", userId);

    if (error) throw error;

    return handleSuccess(res, 200, "Riwayat percakapan berhasil dihapus.");
  } catch (error) {
    console.error("Error menghapus riwayat percakapan:", error);
    return handleError(res, error, "Gagal menghapus riwayat percakapan.");
  }
};
