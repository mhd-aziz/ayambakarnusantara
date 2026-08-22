const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const { sendNotification } = require("./notificationController");
const { v4: uuidv4 } = require("uuid");
const {
  uploadImage,
  deleteFile,
  extractPathFromPublicUrl,
  validateImageMagicBytes,
} = require("../utils/storageHelper");
const {
  validateChatText,
  validateCoordinates,
  validateMessageContent,
} = require("../utils/chatValidation");

function mapConversation(row) {
  if (!row) return null;
  return {
    _id: row.id,
    participantUIDs: row.participant_uids,
    participantInfo: row.participant_info || {},
    lastMessage: row.last_message,
    unreadCounts: row.unread_counts || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMessage(row) {
  if (!row) return null;
  return {
    _id: row.id,
    senderUID: row.sender_uid,
    timestamp: row.created_at,
    text: row.text,
    imageUrl: row.image_url,
    location: row.location,
    type: row.type || "text",
  };
}

exports.startOrGetConversation = async (req, res) => {
  const initiatorUID = req.user?.uid;
  const { recipientUID } = req.body;

  if (!initiatorUID) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!recipientUID) {
    return handleError(res, {
      statusCode: 400,
      message: "recipientUID (UID pengguna tujuan) diperlukan.",
    });
  }
  if (initiatorUID === recipientUID) {
    return handleError(res, {
      statusCode: 400,
      message: "Anda tidak dapat memulai percakapan dengan diri sendiri.",
    });
  }

  const participants = [initiatorUID, recipientUID].sort();
  const conversationId = participants.join("_");

  try {
    const { data: conversationRow, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (convError) throw convError;

    if (conversationRow) {
      const existingConversationData = mapConversation(conversationRow);

      const { data: users, error: usersError } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, photo_url")
        .in("id", participants);

      if (usersError) throw usersError;

      const userCache = {};
      (users || []).forEach((u) => {
        userCache[u.id] = {
          displayName: u.display_name || "Pengguna",
          photoURL: u.photo_url || null,
        };
      });

      let needsInfoUpdate = false;
      const updatedParticipantInfo = {
        ...(existingConversationData.participantInfo || {}),
      };

      participants.forEach((uid) => {
        const fresh = userCache[uid];
        if (!fresh) return;
        const current = updatedParticipantInfo[uid];
        if (
          !current ||
          current.displayName !== fresh.displayName ||
          current.photoURL !== fresh.photoURL
        ) {
          updatedParticipantInfo[uid] = fresh;
          needsInfoUpdate = true;
        }
      });

      if (needsInfoUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from("conversations")
          .update({ participant_info: updatedParticipantInfo })
          .eq("id", conversationId);
        if (updateError) throw updateError;
        existingConversationData.participantInfo = updatedParticipantInfo;
      }

      return handleSuccess(
        res,
        200,
        "Percakapan sudah ada.",
        existingConversationData
      );
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, photo_url")
      .in("id", participants);

    if (usersError) throw usersError;

    if (!users || users.length < 2) {
      return handleError(res, {
        statusCode: 404,
        message: "Satu atau kedua pengguna tidak ditemukan.",
      });
    }

    const userCache = {};
    (users || []).forEach((u) => {
      userCache[u.id] = {
        displayName: u.display_name || "Pengguna",
        photoURL: u.photo_url || null,
      };
    });

    const newConversationData = {
      _id: conversationId,
      participantUIDs: participants,
      participantInfo: {
        [initiatorUID]: userCache[initiatorUID] || {
          displayName: "Pengguna",
          photoURL: null,
        },
        [recipientUID]: userCache[recipientUID] || {
          displayName: "Pengguna",
          photoURL: null,
        },
      },
      lastMessage: null,
      unreadCounts: {
        [initiatorUID]: 0,
        [recipientUID]: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { error: insertError } = await supabaseAdmin
      .from("conversations")
      .insert({
        id: conversationId,
        participant_uids: participants,
        participant_info: newConversationData.participantInfo,
        last_message: null,
        unread_counts: newConversationData.unreadCounts,
      });

    if (insertError) throw insertError;

    return handleSuccess(
      res,
      201,
      "Percakapan berhasil dimulai.",
      newConversationData
    );
  } catch (error) {
    console.error(
      "Error starting or getting conversation:",
      error.message,
      error.stack
    );
    return handleError(res, {
      statusCode: 500,
      message: error.message || "Gagal memulai atau mendapatkan percakapan.",
    });
  }
};

exports.getUserConversations = async (req, res) => {
  const userUID = req.user?.uid;

  if (!userUID) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .contains("participant_uids", [userUID])
      .order("updated_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return handleSuccess(res, 200, "Tidak ada percakapan ditemukan.", []);
    }

    const conversations = data.map(mapConversation);
    return handleSuccess(
      res,
      200,
      "Daftar percakapan berhasil diambil.",
      conversations
    );
  } catch (error) {
    console.error("Error getting user conversations:", error);
    return handleError(res, error, "Gagal mengambil daftar percakapan.");
  }
};

exports.sendMessage = async (req, res) => {
  const senderUID = req.user?.uid;
  const { conversationId } = req.params;
  const { text, latitude, longitude } = req.body;
  const imageFile = req.file;

  if (!senderUID) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!conversationId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Percakapan diperlukan.",
    });
  }
  // ROADMAP #14: validasi panjang teks + range koordinat.
  const textCheck = validateChatText(text);
  if (!textCheck.valid) {
    return handleError(res, { statusCode: 400, message: textCheck.message });
  }
  const coordCheck = validateCoordinates(latitude, longitude);
  if (!coordCheck.valid) {
    return handleError(res, { statusCode: 400, message: coordCheck.message });
  }
  const contentCheck = validateMessageContent({
    hasText: !!(text && String(text).trim()),
    hasImage: !!imageFile,
    hasLocation: !!(latitude && longitude),
  });
  if (!contentCheck.valid) {
    return handleError(res, { statusCode: 400, message: contentCheck.message });
  }
  // ROADMAP #10: magic-bytes check untuk file gambar (bukan cuma mime).
  if (imageFile && !validateImageMagicBytes(imageFile.buffer)) {
    return handleError(res, {
      statusCode: 400,
      message: "File gambar tidak valid (signature tidak dikenali).",
    });
  }

  try {
    const { data: conversationRow, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();

    if (convError) throw convError;

    if (!conversationRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Percakapan tidak ditemukan.",
      });
    }

    const conversationData = mapConversation(conversationRow);
    if (
      !conversationData.participantUIDs ||
      !conversationData.participantUIDs.includes(senderUID)
    ) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda bukan partisipan dalam percakapan ini.",
      });
    }

    const recipientUID = conversationData.participantUIDs.find(
      (uid) => uid !== senderUID
    );

    let newMessageData = {
      type: "text",
      text: null,
      image_url: null,
      location: null,
    };
    let lastMessageText = "";

    if (imageFile) {
      newMessageData.type = "image";
      lastMessageText = text?.trim() || "Gambar";
      newMessageData.text = text?.trim() || null;

      const fileExtension = imageFile.originalname.split(".").pop();
      const fileName = `chat-images/${conversationId}/${uuidv4()}.${fileExtension}`;
      newMessageData.image_url = await uploadImage(
        "chat-images",
        fileName,
        imageFile.buffer,
        imageFile.mimetype
      );
    } else if (latitude && longitude) {
      newMessageData.type = "location";
      lastMessageText = "📍 Lokasi";
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lon)) {
        return handleError(res, {
          statusCode: 400,
          message: "Latitude dan Longitude harus berupa angka.",
        });
      }
      newMessageData.location = { latitude: lat, longitude: lon };
    } else {
      newMessageData.type = "text";
      newMessageData.text = text.trim();
      lastMessageText = text.trim();
    }

    const { data: messageRow, error: insertError } = await supabaseAdmin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_uid: senderUID,
        type: newMessageData.type,
        text: newMessageData.text,
        image_url: newMessageData.image_url,
        location: newMessageData.location,
        read: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Update lastMessage + unreadCounts penerima
    const unreadCounts = { ...(conversationRow.unread_counts || {}) };
    unreadCounts[recipientUID] = (unreadCounts[recipientUID] || 0) + 1;

    const { error: convUpdateError } = await supabaseAdmin
      .from("conversations")
      .update({
        last_message: {
          text: lastMessageText,
          senderUID,
          timestamp: new Date().toISOString(),
        },
        unread_counts: unreadCounts,
      })
      .eq("id", conversationId);

    if (convUpdateError) throw convUpdateError;

    const createdMessageForResponse = mapMessage(messageRow);

    const senderInfo = conversationData.participantInfo
      ? conversationData.participantInfo[senderUID]
      : null;
    const senderName = senderInfo ? senderInfo.displayName : "Seseorang";

    const notificationPayload = {
      userId: recipientUID,
      title: `Pesan baru dari ${senderName}`,
      body: lastMessageText,
      data: { conversationId: conversationId, type: "NEW_MESSAGE" },
    };
    await sendNotification(notificationPayload);

    return handleSuccess(
      res,
      201,
      "Pesan berhasil dikirim.",
      createdMessageForResponse
    );
  } catch (error) {
    console.error("Error sending message:", error);
    console.error("DETAIL ERROR:", JSON.stringify(error, null, 2));
    return handleError(res, error, "Gagal mengirim pesan.");
  }
};

exports.getConversationMessages = async (req, res) => {
  const userUID = req.user?.uid;
  const { conversationId } = req.params;
  const { limit = 20, beforeTimestamp } = req.query;

  if (!userUID) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!conversationId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Percakapan diperlukan.",
    });
  }

  try {
    const { data: conversationRow, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("id, participant_uids")
      .eq("id", conversationId)
      .maybeSingle();

    if (convError) throw convError;

    if (!conversationRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Percakapan tidak ditemukan.",
      });
    }
    if (!conversationRow.participant_uids.includes(userUID)) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda bukan partisipan dalam percakapan ini.",
      });
    }

    let query = supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false });

    if (beforeTimestamp) {
      try {
        const parsedTimestamp = new Date(beforeTimestamp);
        if (isNaN(parsedTimestamp.valueOf())) {
          throw new Error("Invalid date format for beforeTimestamp");
        }
        query = query.lt("created_at", parsedTimestamp.toISOString());
      } catch (e) {
        return handleError(res, {
          statusCode: 400,
          message: `Format beforeTimestamp tidak valid: ${e.message}`,
        });
      }
    }

    const numLimit = parseInt(limit, 10);
    query = query.limit(isNaN(numLimit) || numLimit <= 0 ? 20 : numLimit);

    const { data: messageRows, error: messagesError } = await query;

    if (messagesError) throw messagesError;

    const messages = (messageRows || []).map(mapMessage).reverse();

    return handleSuccess(
      res,
      200,
      "Pesan percakapan berhasil diambil.",
      messages
    );
  } catch (error) {
    console.error("Error getting conversation messages:", error);
    return handleError(res, error, "Gagal mengambil pesan percakapan.");
  }
};

exports.markConversationAsRead = async (req, res) => {
  const userUID = req.user?.uid;
  const { conversationId } = req.params;

  if (!userUID) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!conversationId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Percakapan diperlukan.",
    });
  }

  try {
    const { data: conversationRow, error: convError } = await supabaseAdmin
      .from("conversations")
      .select("participant_uids, unread_counts")
      .eq("id", conversationId)
      .maybeSingle();

    if (convError) throw convError;

    if (!conversationRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Percakapan tidak ditemukan.",
      });
    }
    if (!conversationRow.participant_uids.includes(userUID)) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda bukan partisipan dalam percakapan ini.",
      });
    }

    const unreadCounts = conversationRow.unread_counts || {};
    if (typeof unreadCounts[userUID] === "number" && unreadCounts[userUID] > 0) {
      unreadCounts[userUID] = 0;
      const { error: updateError } = await supabaseAdmin
        .from("conversations")
        .update({ unread_counts: unreadCounts })
        .eq("id", conversationId);
      if (updateError) throw updateError;
      return handleSuccess(res, 200, "Percakapan ditandai sudah dibaca.");
    }

    return handleSuccess(
      res,
      200,
      "Tidak ada pesan baru untuk ditandai sudah dibaca."
    );
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    return handleError(res, error, "Gagal menandai percakapan sudah dibaca.");
  }
};
