const axios = require("axios");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const { supabaseAdmin } = require("../config/supabaseConfig");

const OMNIROUTE_API_URL =
  process.env.OMNIROUTE_API_URL || "https://omniroutelocal.zisaltech.site/v1/chat/completions";
const OMNIROUTE_API_KEY = process.env.OMNIROUTE_API_KEY || "";
const OMNIROUTE_MODEL = process.env.OMNIROUTE_MODEL || "auto/best-chat";

const SYSTEM_PROMPT =
  "Kamu adalah customer service Ayam Bakar Nusantara, marketplace multi-vendor ayam bakar dan makanan Nusantara. " +
  "Bantu pelanggan dengan ramah dalam Bahasa Indonesia, jawab singkat (maks 3-4 kalimat) dan sopan. " +
  "Kamu bisa menjawab: produk & menu, toko, cara pemesanan, pembayaran (online via Midtrans atau " +
  "bayar di tempat), status pesanan, rating, chat penjual, dan lainnya.\n" +
  "PENGETAHUAN TENTANG MARKETPLACE INI:\n" +
  "1. Pembeli bisa melihat menu, menambah ke keranjang, checkout, membayar, chat penjual, dan memberi rating. " +
  "Penjual bisa buka toko gratis, mengunggah produk, memproses pesanan, dan melihat statistik toko.\n" +
  "2. Satu akun bisa menjadi pembeli sekaligus penjual. Buka toko cukup satu formulir dan role otomatis jadi penjual. " +
  "Satu akun maksimal satu toko; nama toko selalu sama dengan nama tampilan profil.\n" +
  "3. Cara memesan: login, pilih produk di halaman menu (/menu), tentukan jumlah (maksimal stok), masuk ke keranjang, " +
  "lalu checkout dengan memilih metode pembayaran dan catatan opsional.\n" +
  "4. Dua metode pembayaran: (a) Bayar di Tempat — pesan, penjual proses, ambil dan bayar tunai di toko; " +
  "(b) Pembayaran Online via Midtrans — bayar dengan transfer, QRIS, atau VA; pelunasan terdeteksi otomatis " +
  "lewat webhook atau cek status. Tidak ada potongan biaya platform.\n" +
  "5. Status pesanan: Menunggu Pembayaran/Menunggu Konfirmasi -> Dikonfirmasi -> Sedang Diproses -> Siap Diambil -> Selesai. " +
  "Pesanan hanya bisa dibatalkan di dua status awal dan stok otomatis dikembalikan.\n" +
  "6. Rating hanya bisa diberikan setelah pesanan selesai, satu rating per produk per pesanan.\n" +
  "7. Penjual dapat menghapus toko kapan saja; produk dan toko ikut terhapus.\n" +
  "8. Pengiriman tidak tersedia — pesanan diambil langsung di toko (pickup only).\n" +
  "ATURAN PENTING:\n" +
  "1. Bila diberikan \"DATA PESANAN USER\", GUNAKAN data itu untuk menjawab pertanyaan tentang " +
  "pesanan pengguna (sebutkan status, item, total, dan status pembayarannya). Jangan pernah mengaku " +
  "tidak punya akses ke data pesanan.\n" +
  "2. Bila tidak ada \"DATA PESANAN USER\" dan pengguna bertanya soal pesanan, katakan dengan ramah " +
  "bahwa tidak ditemukan pesanan yang cocok (atau minta nomor pesanan), lalu tawarkan bantuan lain " +
  "seperti melihat menu atau cara memesan.\n" +
  "3. Bila diberikan \"DATA MENU UNGGULAN\" atau \"DATA TOKO TERSEDIA\", gunakan untuk menjawab pertanyaan " +
  "tentang menu/produk atau toko dengan harga dan nama yang nyata.\n" +
  "4. Jangan meminta pengguna meninggalkan aplikasi — semua layanan tersedia di aplikasi ini.\n" +
  "5. Jika pengguna menyebutkan nomor/nama pesanan yang tidak ditemukan, sampaikan dengan sopan dan " +
  "minta memastikan kembali nomornya.";

// Label status order & pembayaran dalam Bahasa Indonesia
const ORDER_STATUS_LABEL = {
  PENDING_CONFIRMATION: "Menunggu Konfirmasi Penjual",
  CONFIRMED: "Dikonfirmasi Penjual",
  PROCESSING: "Sedang Diproses",
  READY_FOR_PICKUP: "Siap Diambil",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  AWAITING_PAYMENT: "Menunggu Pembayaran",
};

const PAYMENT_STATUS_LABEL = {
  paid: "Lunas",
  pending: "Belum Dibayar",
  pending_gateway_payment: "Menunggu Pembayaran di Gerbang Pembayaran",
  refunded: "Dikembalikan",
  failed: "Gagal",
};

const formatRupiah = (n) => "Rp " + Number(n || 0).toLocaleString("id-ID");

// Deteksi apakah pesan user menanyakan soal pesanan (dan apakah menyebut ID order)
function detectOrderIntent(text) {
  const lower = (text || "").toLowerCase();
  const isOrder = /(pesanan?|order|nota|transaksi|pembayaran|status|cek|dimana|kapan|proses|siap|selesai|kirim|sampai|terima)/i.test(
    lower
  );
  const orderIdMatch = lower.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return { isOrder, orderId: orderIdMatch ? orderIdMatch[0] : null };
}

// Ambil order milik user (terbaru, atau by id bila disebut) lalu rangkai jadi konteks prompt
async function buildOrderContext(userId, userText) {
  if (!userId) return null;
  try {
    const { isOrder, orderId } = detectOrderIntent(userText);
    if (!isOrder) return null;

    let query = supabaseAdmin
      .from("orders")
      .select("id,order_status,payment_method,payment_details,items,total_price,created_at");
    if (orderId) {
      query = query.eq("id", orderId);
    } else {
      query = query.order("created_at", { ascending: false }).limit(1);
    }
    query = query.eq("user_id", userId);

    const { data: order, error } = await query.maybeSingle();
    if (error) {
      console.error("Chatbot gagal mengambil data pesanan:", error.message);
      return null;
    }

    if (!order) {
      return (
        "DATA PESANAN USER: Tidak ditemukan pesanan yang cocok untuk pengguna ini" +
        (orderId ? " (nomor yang disebutkan tidak terdaftar pada akun ini)." : " (belum ada pesanan terdaftar).") +
        " Bila pengguna bertanya soal pesanan, sampaikan dengan ramah bahwa tidak ada pesanan " +
        "yang ditemukan, lalu tawarkan bantuan lain."
      );
    }

    const items = (order.items || [])
      .map((it) => `${it.name} x${it.quantity} (${formatRupiah(it.subtotal)})`)
      .join(", ");
    const payMethod =
      order.payment_method === "ONLINE_PAYMENT" ? "Pembayaran Online (Midtrans)" : "Bayar di Tempat";
    const payStatus =
      order.payment_details?.status ||
      (order.payment_method === "PAY_AT_STORE" ? "paid" : "pending");

    return [
      `DATA PESANAN USER (pesanan #${String(order.id).slice(0, 8)}):`,
      `- Status pesanan: ${ORDER_STATUS_LABEL[order.order_status] || order.order_status}`,
      `- Item: ${items || "-"}`,
      `- Total: ${formatRupiah(order.total_price)}`,
      `- ${payMethod}; status pembayaran: ${PAYMENT_STATUS_LABEL[payStatus] || payStatus}`,
      `- Tanggal order: ${new Date(order.created_at).toLocaleString("id-ID")}`,
      "Gunakan data di atas untuk menjawab pertanyaan pengguna tentang pesanannya.",
    ].join("\n");
  } catch (err) {
    console.error("Chatbot buildOrderContext error:", err.message);
    return null;
  }
}

// Ambil menu unggulan nyata sebagai konteks jawaban soal produk
async function buildMenuContext() {
  try {
    const { data: products, error } = await supabaseAdmin
      .from("products")
      .select("name,price,shop_id")
      .order("created_at", { ascending: false })
      .limit(8);
    if (error || !products || products.length === 0) return null;

    const shopMap = {};
    const { data: shopRows } = await supabaseAdmin
      .from("shops")
      .select("id,shop_name");
    (shopRows || []).forEach((s) => {
      shopMap[s.id] = s.shop_name;
    });

    const lines = products.map(
      (p) =>
        `- ${p.name} ${formatRupiah(p.price)} (toko: ${shopMap[p.shop_id] || "tidak diketahui"})`
    );
    return (
      "DATA MENU UNGGULAN SAAT INI:\n" +
      lines.join("\n") +
      "\nGunakan data ini bila pengguna bertanya tentang menu/produk yang tersedia."
    );
  } catch (e) {
    return null;
  }
}

// Ambil daftar toko nyata sebagai konteks jawaban soal toko/penjual
async function buildShopContext() {
  try {
    const { data: shops, error } = await supabaseAdmin
      .from("shops")
      .select("id,shop_name,shop_address")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error || !shops || shops.length === 0) return null;

    const lines = shops.map(
      (s) =>
        `- ${s.shop_name}` +
        (s.shop_address ? ` (alamat: ${s.shop_address})` : "")
    );
    return (
      "DATA TOKO TERSEDIA SAAT INI:\n" +
      lines.join("\n") +
      "\nGunakan data ini bila pengguna bertanya tentang toko atau penjual yang tersedia."
    );
  } catch (e) {
    return null;
  }
}

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

    // Konteks dinamis: data pesanan user (bila bertanya pesanan), menu unggulan,
    // dan daftar toko nyata. Konteks diisi sesuai intent supaya hemat token.
    const { isOrder, orderId } = detectOrderIntent(userMessageText);
    const lowerText = userMessageText.toLowerCase();
    const asksAboutShop = /(toko|penjual|warung|outlet|seller)/i.test(lowerText);
    const asksAboutMenu = /(menu|produk|makanan|minuman|camilan|harga|murah|enak|ayam|nasi|sate)/i.test(
      lowerText
    );

    const contextJobs = [];
    if (isOrder) contextJobs.push(buildOrderContext(userId, userMessageText));
    if (asksAboutMenu || !asksAboutShop)
      contextJobs.push(buildMenuContext());
    if (asksAboutShop) contextJobs.push(buildShopContext());

    const contexts = await Promise.all(contextJobs);
    const dynamicContext = contexts.filter(Boolean).join("\n\n");
    const systemContent = dynamicContext
      ? `${SYSTEM_PROMPT}\n\n${dynamicContext}`
      : SYSTEM_PROMPT;

    const messagesForModel = [
      { role: "system", content: systemContent },
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
