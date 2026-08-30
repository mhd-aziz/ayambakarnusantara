const { supabaseAdmin } = require("../config/supabaseConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const { sendNotification } = require("./notificationController");
const { uploadPrivateImage, mapPaymentProofUrls } = require("../utils/storageHelper");
const path = require("path");

async function mapOrderAsync(row) {
  if (!row) return null;
  const pd = { ...(row.payment_details || {}) };
  if (pd.proofImageURLs && pd.proofImageURLs.length > 0) {
    pd.proofImageURLs = await mapPaymentProofUrls(pd.proofImageURLs);
  }
  return {
    orderId: row.id,
    userId: row.user_id,
    items: row.items,
    totalPrice: Number(row.total_price),
    paymentDetails: pd,
    orderStatus: row.order_status,
    orderType: "PICKUP",
    notes: row.notes,
    shopIds: row.shop_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function mapOrdersAsync(rows) {
  if (!rows || rows.length === 0) return [];
  return Promise.all(rows.map(mapOrderAsync));
}

async function getOrderRow(orderId) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getShopOwnerUid(shopId) {
  if (!shopId) return null;
  const { data } = await supabaseAdmin
    .from("shops")
    .select("user_id")
    .eq("id", shopId)
    .maybeSingle();
  return data?.user_id || null;
}

exports.createOrder = async (req, res) => {
  const userId = req.user?.uid;
  const { paymentMethod, notes } = req.body;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  if (!paymentMethod) {
    return handleError(res, {
      statusCode: 400,
      message:
        "Metode pembayaran diperlukan. Contoh: 'PAY_AT_STORE' atau 'ONLINE_PAYMENT'.",
    });
  }

  try {
    const { data: newOrder, error } = await supabaseAdmin.rpc("create_order", {
      p_user_id: userId,
      p_payment_method: paymentMethod,
      p_notes: notes || null,
    });

    if (error) throw error;

    // Notifikasi seller — SEMUA toko yang terlibat (perbaikan ROADMAP #3:
    // sebelumnya hanya items[0].shopId, seller lain di order multi-toko tidak mendapat notif)
    try {
      const shopIds = [
        ...new Set(
          (newOrder.items || [])
            .map((item) => item.shopId)
            .filter(Boolean)
        ),
      ];
      if (shopIds.length > 0) {
        const { data: customer } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle();
        const customerName = customer?.display_name || "Seorang pelanggan";

        for (const shopId of shopIds) {
          const sellerUID = await getShopOwnerUid(shopId);
          if (!sellerUID) continue;
          const notificationPayload = {
            userId: sellerUID,
            title: "Pesanan Baru Diterima!",
            body: `${customerName} telah membuat pesanan baru #${newOrder.id.substring(0, 20)}.`,
            data: { orderId: newOrder.id, type: "NEW_ORDER" },
          };
          await sendNotification(notificationPayload);
        }
      }
    } catch (notifError) {
      console.error("Gagal mengirim notifikasi pesanan baru ke seller:", notifError);
    }

    return handleSuccess(res, 201, "Pesanan berhasil dibuat.", await mapOrderAsync(newOrder));
  } catch (error) {
    console.error("Error creating order:", error);
    return handleError(res, {
      statusCode: 500,
      message: `Gagal membuat pesanan: ${error.message || ""}`.trim(),
    });
  }
};

exports.getUserOrders = async (req, res) => {
  const userId = req.user?.uid;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      return handleSuccess(res, 200, "Anda belum memiliki pesanan.", []);
    }

    const orders = await mapOrdersAsync(data);
    return handleSuccess(res, 200, "Data pesanan berhasil diambil.", orders);
  } catch (error) {
    console.error("Error getting user orders:", error);
    return handleError(res, {
      statusCode: 500,
      message: "Gagal mengambil data pesanan.",
    });
  }
};

exports.getOrderDetailsForCustomer = async (req, res) => {
  const customerId = req.user?.uid;
  const { orderId } = req.params;

  if (!customerId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!orderId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Pesanan diperlukan.",
    });
  }

  try {
    const { data: orderRow, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;

    if (!orderRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    if (orderRow.user_id !== customerId) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda tidak diizinkan untuk mengakses detail pesanan ini.",
      });
    }

    let shopDetails = null;
    if (orderRow.items && orderRow.items.length > 0) {
      const shopId = orderRow.items[0].shopId;
      if (shopId) {
        const { data: shopData } = await supabaseAdmin
          .from("shops")
          .select("shop_name, shop_address, banner_image_url, description")
          .eq("id", shopId)
          .maybeSingle();
        if (shopData) {
          shopDetails = {
            shopName: shopData.shop_name,
            shopAddress: shopData.shop_address,
            bannerImageURL: shopData.banner_image_url,
            description: shopData.description,
          };
        }
      }
    }

    const orderData = await mapOrderAsync(orderRow);

    return handleSuccess(res, 200, "Detail pesanan berhasil diambil.", {
      order: orderData,
      shopDetails,
    });
  } catch (error) {
    console.error("Error getting order details for customer:", error);
    return handleError(res, {
      statusCode: 500,
      message: "Gagal mengambil detail pesanan untuk customer.",
    });
  }
};

exports.getSellerOrders = async (req, res) => {
  const sellerId = req.user?.uid;
  const {
    status: statusQuery,
    customerUserId: customerUserIdQuery,
    customerSearch: customerSearchQuery,
    orderId: orderIdQuery,
  } = req.query;

  if (!sellerId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    const { data: sellerUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", sellerId)
      .maybeSingle();

    if (userError) throw userError;

    if (!sellerUser || sellerUser.role !== "seller") {
      return handleError(res, {
        statusCode: 403,
        message: "Hanya seller yang dapat mengakses daftar pesanan ini.",
      });
    }

    const sellerOwnedShopId = sellerUser.shop_id;
    if (!sellerOwnedShopId) {
      return handleError(res, {
        statusCode: 403,
        message:
          "Hanya seller dengan id toko yang valid yang dapat mengakses daftar pesanan ini.",
      });
    }

    let ordersQuery = supabaseAdmin
      .from("orders")
      .select("*")
      .contains("shop_ids", [sellerOwnedShopId]);

    if (customerUserIdQuery) {
      ordersQuery = ordersQuery.eq("user_id", customerUserIdQuery);
    }

    if (statusQuery && statusQuery.toUpperCase() !== "ALL") {
      ordersQuery = ordersQuery.eq("order_status", statusQuery.toUpperCase());
    }

    ordersQuery = ordersQuery.order("created_at", { ascending: false });

    const { data: allFetchedOrders, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    let messageIfEmpty = "Tidak ada pesanan ditemukan untuk kriteria ini.";
    if (orderIdQuery || customerSearchQuery) {
      messageIfEmpty =
        "Tidak ada pesanan yang cocok dengan kriteria pencarian untuk toko Anda.";
    }

    if (!allFetchedOrders || allFetchedOrders.length === 0) {
      return handleSuccess(res, 200, messageIfEmpty, []);
    }

    // Ambil data customer (untuk customerDetails & pencarian)
    const customerIds = [
      ...new Set(allFetchedOrders.map((o) => o.user_id).filter(Boolean)),
    ];
    const customerCache = {};
    if (customerIds.length > 0) {
      const { data: customers } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name, email, phone_number, photo_url")
        .in("id", customerIds);
      (customers || []).forEach((c) => {
        customerCache[c.id] = c;
      });
    }

    const sellerOrdersPromises = allFetchedOrders.map(async (orderRow) => {
      if (
        !(
          orderRow.items &&
          orderRow.items.length > 0 &&
          orderRow.items.some((item) => item.shopId === sellerOwnedShopId)
        )
      ) {
        return null;
      }

      if (orderIdQuery) {
        const orderIdTerm = orderIdQuery.toLowerCase();
        if (!orderRow.id || !orderRow.id.toLowerCase().includes(orderIdTerm)) {
          return null;
        }
      }

      const orderData = await mapOrderAsync(orderRow);

      let customerDetails = null;
      const cust = customerCache[orderRow.user_id];
      if (cust) {
        customerDetails = {
          userId: orderRow.user_id,
          displayName: cust.display_name || null,
          email: cust.email || null,
          phoneNumber: cust.phone_number || null,
          photoURL: cust.photo_url || null,
        };
      }
      orderData.customerDetails = customerDetails;

      if (customerSearchQuery) {
        if (!customerDetails) return null;
        const searchTerm = customerSearchQuery.toLowerCase();
        const nameMatch =
          customerDetails.displayName &&
          customerDetails.displayName.toLowerCase().includes(searchTerm);
        const emailMatch =
          customerDetails.email &&
          customerDetails.email.toLowerCase().includes(searchTerm);
        if (!nameMatch && !emailMatch) return null;
      }

      return orderData;
    });

    const filteredOrders = (await Promise.all(sellerOrdersPromises)).filter(
      (order) => order !== null
    );

    if (filteredOrders.length === 0) {
      return handleSuccess(res, 200, messageIfEmpty, []);
    }

    return handleSuccess(
      res,
      200,
      "Daftar pesanan untuk seller berhasil diambil.",
      filteredOrders
    );
  } catch (error) {
    console.error("Error getting seller orders:", error);
    return handleError(res, {
      statusCode: 500,
      message: "Gagal mengambil daftar pesanan untuk seller.",
      detail: error.message,
    });
  }
};

exports.getOrderDetailsForSeller = async (req, res) => {
  const sellerId = req.user?.uid;
  const { orderId } = req.params;

  if (!sellerId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!orderId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Pesanan diperlukan.",
    });
  }

  try {
    const { data: sellerUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", sellerId)
      .maybeSingle();

    if (userError) throw userError;

    if (!sellerUser || sellerUser.role !== "seller") {
      return handleError(res, {
        statusCode: 403,
        message: "Hanya seller yang dapat mengakses ini.",
      });
    }
    const sellerOwnedShopId = sellerUser.shop_id;
    if (!sellerOwnedShopId) {
      return handleError(res, {
        statusCode: 403,
        message: "Seller tidak memiliki informasi toko yang valid.",
      });
    }

    const { data: orderRow, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error) throw error;

    if (!orderRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    if (!orderRow.items || orderRow.items.length === 0) {
      return handleError(res, {
        statusCode: 400,
        message: "Pesanan tidak memiliki item.",
      });
    }
    const orderHasItemFromSellerShop = orderRow.items.some(
      (item) => item.shopId === sellerOwnedShopId
    );
    if (!orderHasItemFromSellerShop) {
      return handleError(res, {
        statusCode: 403,
        message:
          "Anda tidak berhak mengakses detail pesanan ini karena tidak terkait dengan toko Anda.",
      });
    }

    let customerInfo = null;
    const customerUID = orderRow.user_id;
    if (customerUID) {
      const { data: customerUser } = await supabaseAdmin
        .from("profiles")
        .select("display_name, email, phone_number, photo_url")
        .eq("id", customerUID)
        .maybeSingle();
      if (customerUser) {
        customerInfo = {
          displayName: customerUser.display_name,
          email: customerUser.email,
          phoneNumber: customerUser.phone_number,
          photoURL: customerUser.photo_url,
        };
      }
    }

    const orderData = await mapOrderAsync(orderRow);

    return handleSuccess(res, 200, "Detail pesanan berhasil diambil.", {
      order: orderData,
      customerDetails: customerInfo,
    });
  } catch (error) {
    console.error("Error getting order details for seller:", error);
    return handleError(res, {
      statusCode: 500,
      message: "Gagal mengambil detail pesanan untuk seller.",
    });
  }
};

exports.cancelOrder = async (req, res) => {
  const userId = req.user?.uid;
  const { orderId } = req.params;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!orderId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Pesanan diperlukan.",
    });
  }

  try {
    const { data: updatedOrder, error } = await supabaseAdmin.rpc("cancel_order", {
      p_order_id: orderId,
      p_user_id: userId,
    });

    if (error) throw error;

    // Notifikasi ke SEMUA seller yang produknya ada di order (multi-toko)
    try {
      const shopIds = [...new Set((updatedOrder.items || []).map((i) => i.shopId).filter(Boolean))];
      for (const shopId of shopIds) {
        const sellerUID = await getShopOwnerUid(shopId);
        if (sellerUID) {
          const notificationPayload = {
            userId: sellerUID,
            title: "Pesanan Dibatalkan",
            body: `Pesanan #${orderId.substring(0, 20)} telah dibatalkan oleh pelanggan.`,
            data: { orderId, type: "ORDER_CANCELLED" },
          };
          await sendNotification(notificationPayload);
        }
      }
    } catch (notifError) {
      console.error("Gagal mengirim notifikasi pembatalan pesanan ke seller:", notifError);
    }

    return handleSuccess(
      res,
      200,
      "Pesanan berhasil dibatalkan.",
      await mapOrderAsync(updatedOrder)
    );
  } catch (error) {
    console.error("Error cancelling order:", error);
    return handleError(res, {
      statusCode: 500,
      message: `Gagal membatalkan pesanan: ${error.message || ""}`.trim(),
    });
  }
};

exports.updateOrderStatusBySeller = async (req, res) => {
  const sellerId = req.user?.uid;
  const { orderId } = req.params;
  const { newStatus } = req.body;

  if (!sellerId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!orderId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Pesanan diperlukan.",
    });
  }

  const allowedNewStatuses = [
    "PROCESSING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CONFIRMED",
  ];
  if (!newStatus || !allowedNewStatuses.includes(newStatus.toUpperCase())) {
    return handleError(res, {
      statusCode: 400,
      message: `Status baru tidak valid atau tidak disediakan. Harap set 'newStatus' menjadi salah satu dari: ${allowedNewStatuses.join(", ")}.`,
    });
  }
  const normalizedNewStatus = newStatus.toUpperCase();

  try {
    const { data: sellerUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", sellerId)
      .maybeSingle();

    if (userError) throw userError;

    if (!sellerUser || sellerUser.role !== "seller") {
      return handleError(res, {
        statusCode: 403,
        message: "Hanya seller yang dapat memperbarui status pesanan ini.",
      });
    }
    const sellerShopId = sellerUser.shop_id;
    if (!sellerShopId) {
      return handleError(res, {
        statusCode: 403,
        message: "Seller tidak memiliki informasi toko yang valid.",
      });
    }

    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) throw orderError;

    if (!orderRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    const orderHasItemFromSellerShop = orderRow.items.some(
      (item) => item.shopId === sellerShopId
    );
    if (!orderHasItemFromSellerShop) {
      return handleError(res, {
        statusCode: 403,
        message:
          "Anda tidak berhak memperbarui status pesanan ini karena tidak terkait dengan toko Anda.",
      });
    }

    const pd = orderRow.payment_details || {};
    const method = (pd.method || "").toUpperCase();
    const paymentStatus = pd.status;

    let validPreviousStatuses;
    let paymentStatusUpdate = {};

    switch (normalizedNewStatus) {
      case "CONFIRMED":
        validPreviousStatuses = ["PENDING_CONFIRMATION"];
        if (method !== "PAY_AT_STORE") {
          return handleError(res, {
            statusCode: 400,
            message: "Status CONFIRMED hanya untuk pesanan Bayar di Tempat.",
          });
        }
        break;
      case "PROCESSING":
        if (method === "ONLINE_PAYMENT" && paymentStatus !== "paid") {
          return handleError(res, {
            statusCode: 400,
            message: "Pembayaran online untuk pesanan ini belum lunas.",
          });
        }
        validPreviousStatuses =
          method === "PAY_AT_STORE"
            ? ["CONFIRMED"]
            : ["AWAITING_PAYMENT"];
        break;
      case "READY_FOR_PICKUP":
        validPreviousStatuses = ["PROCESSING"];
        break;
      case "COMPLETED":
        validPreviousStatuses = ["READY_FOR_PICKUP"];
        if (method === "PAY_AT_STORE" && paymentStatus !== "paid") {
          return handleError(res, {
            statusCode: 400,
            message:
              "Pesanan Bayar di Tempat harus ditandai lunas sebelum diselesaikan.",
          });
        }
        break;
      default:
        return handleError(res, {
          statusCode: 500,
          message: "Terjadi kesalahan internal dalam pemrosesan status.",
        });
    }

    if (!validPreviousStatuses.includes(orderRow.order_status)) {
      return handleError(res, {
        statusCode: 400,
        message: `Pesanan dengan status "${orderRow.order_status}" tidak dapat diubah menjadi "${normalizedNewStatus}" saat ini.`,
      });
    }

    if (orderRow.order_status === normalizedNewStatus) {
      return handleError(res, {
        statusCode: 400,
        message: `Pesanan sudah dalam status "${normalizedNewStatus}".`,
      });
    }

    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ order_status: normalizedNewStatus })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notifikasi customer
    try {
      const notificationPayload = {
        userId: orderRow.user_id,
        title: "Status Pesanan Diperbarui!",
        body: `Status pesanan #${orderId.substring(0, 20)} kini adalah ${normalizedNewStatus}.`,
        data: { orderId, type: "ORDER_STATUS_UPDATE" },
      };
      await sendNotification(notificationPayload);
    } catch (notifError) {
      console.error("Gagal mengirim notifikasi status pesanan:", notifError);
    }

    return handleSuccess(
      res,
      200,
      `Status pesanan berhasil diperbarui menjadi ${normalizedNewStatus}.`,
      await mapOrderAsync(updatedRow)
    );
  } catch (error) {
    console.error("Error updating order status by seller:", error);
    return handleError(res, {
      statusCode: 500,
      message: `Gagal memperbarui status pesanan: ${error.message || ""}`.trim(),
    });
  }
};

exports.confirmPayAtStorePaymentBySeller = async (req, res) => {
  const sellerId = req.user?.uid;
  const { orderId } = req.params;
  const { paymentConfirmationNotes } = req.body;

  if (!sellerId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!orderId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Pesanan diperlukan.",
    });
  }

  try {
    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) throw orderError;

    if (!orderRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    const { data: sellerUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", sellerId)
      .maybeSingle();

    if (userError) throw userError;

    if (
      !sellerUser ||
      sellerUser.role !== "seller" ||
      !orderRow.items.some((item) => item.shopId === sellerUser.shop_id)
    ) {
      return handleError(res, { statusCode: 403, message: "Akses ditolak." });
    }

    const pd = orderRow.payment_details || {};
    if ((pd.method || "").toUpperCase() !== "PAY_AT_STORE") {
      return handleError(res, {
        statusCode: 400,
        message: "Fungsi ini hanya untuk pesanan 'Bayar di Tempat'.",
      });
    }

    const proofImageURLs = pd.proofImageURLs || [];
    let newProofsUploaded = false;
    if (req.files && req.files.length > 0) {
      newProofsUploaded = true;
      for (const file of req.files) {
        const timestamp = Date.now();
        const originalNameWithoutExt = path.parse(file.originalname).name;
        const extension = path.parse(file.originalname).ext;
        const fileName = `orders/${orderId}/paymentProofs/${timestamp}-${originalNameWithoutExt.replace(
          /\s+/g,
          "_"
        )}${extension}`;
        const storedPath = await uploadPrivateImage(
          "orders",
          fileName,
          file.buffer,
          file.mimetype
        );
        proofImageURLs.push(storedPath);
      }
    }

    const newPd = {
      ...pd,
      status: "paid",
      confirmedAt: new Date().toISOString(),
    };
    if (paymentConfirmationNotes) {
      newPd.confirmationNotes = paymentConfirmationNotes;
    }
    if (newProofsUploaded || proofImageURLs.length > 0) {
      newPd.proofImageURLs = proofImageURLs;
    }

    const { data: updatedRow, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ payment_details: newPd })
      .eq("id", orderId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Notifikasi customer
    try {
      const notificationPayload = {
        userId: orderRow.user_id,
        title: "Pembayaran Dikonfirmasi",
        body: `Pembayaran untuk pesanan #${orderId.substring(0, 20)} telah dikonfirmasi oleh penjual.`,
        data: { orderId, type: "PAYMENT_CONFIRMED" },
      };
      await sendNotification(notificationPayload);
    } catch (notifError) {
      console.error(
        "Gagal mengirim notifikasi konfirmasi pembayaran ke customer:",
        notifError
      );
    }

    return handleSuccess(
      res,
      200,
      "Pembayaran Bayar di Tempat berhasil dikonfirmasi" +
        (newProofsUploaded ? " dan bukti pembayaran berhasil diunggah." : "."),
      await mapOrderAsync(updatedRow)
    );
  } catch (error) {
    console.error("Error confirming PAY_AT_STORE payment:", error);
    return handleError(res, {
      statusCode: 500,
      message: `Gagal mengonfirmasi pembayaran: ${error.message || ""}`.trim(),
    });
  }
};

exports.getOrderPaymentProofs = async (req, res) => {
  const userId = req.user?.uid;
  const { orderId } = req.params;

  if (!userId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }
  if (!orderId) {
    return handleError(res, {
      statusCode: 400,
      message: "ID Pesanan diperlukan.",
    });
  }

  try {
    const orderRow = await getOrderRow(orderId);
    if (!orderRow) {
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    const isBuyer = orderRow.user_id === userId;
    let isSeller = false;
    if (!isBuyer) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("shop_id")
        .eq("id", userId)
        .maybeSingle();
      isSeller = !!(
        profile?.shop_id &&
        orderRow.shop_ids &&
        orderRow.shop_ids.includes(profile.shop_id)
      );
    }

    if (!isBuyer && !isSeller) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda tidak berhak melihat bukti pembayaran pesanan ini.",
      });
    }

    const pd = orderRow.payment_details || {};
    const proofs = await mapPaymentProofUrls(pd.proofImageURLs || []);

    return handleSuccess(res, 200, "Bukti pembayaran berhasil diambil.", {
      orderId,
      proofs,
    });
  } catch (error) {
    console.error("Error getting order payment proofs:", error);
    return handleError(res, {
      statusCode: 500,
      message: "Gagal mengambil bukti pembayaran pesanan.",
    });
  }
};

exports.getOrders = async (req, res) => {
  const currentUserId = req.user?.uid;
  const { status: statusQuery, limit = 50 } = req.query;

  if (!currentUserId) {
    return handleError(res, {
      statusCode: 401,
      message: "Otentikasi diperlukan.",
    });
  }

  try {
    const { data: userData, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("role, shop_id")
      .eq("id", currentUserId)
      .maybeSingle();

    if (userError) throw userError;

    if (!userData) {
      return handleError(res, {
        statusCode: 404,
        message: "Data pengguna tidak ditemukan.",
      });
    }
    const userRole = userData.role;

    let ordersQuery = supabaseAdmin.from("orders").select("*");

    if (userRole === "customer") {
      ordersQuery = ordersQuery.eq("user_id", currentUserId);
      if (statusQuery && statusQuery.toUpperCase() !== "ALL") {
        ordersQuery = ordersQuery.eq("order_status", statusQuery.toUpperCase());
      }
    } else if (userRole === "seller") {
      const sellerOwnedShopId = userData.shop_id;
      if (!sellerOwnedShopId) {
        return handleError(res, {
          statusCode: 403,
          message: "Seller tidak memiliki informasi toko yang valid.",
        });
      }
      // Filter toko dilakukan DI SQL (shop_ids @> {shopId}) sebelum limit,
      // supaya pesanan toko ini tidak terpotong oleh batas 50 order terbaru.
      ordersQuery = ordersQuery.contains("shop_ids", [sellerOwnedShopId]);
      if (statusQuery && statusQuery.toUpperCase() !== "ALL") {
        ordersQuery = ordersQuery.eq("order_status", statusQuery.toUpperCase());
      }
    } else {
      return handleError(res, {
        statusCode: 403,
        message: "Peran pengguna tidak valid untuk mengakses pesanan.",
      });
    }

    const numLimit = parseInt(limit, 10);
    ordersQuery = ordersQuery
      .order("created_at", { ascending: false })
      .limit(isNaN(numLimit) || numLimit <= 0 ? 50 : numLimit);

    const { data: orderRows, error: ordersError } = await ordersQuery;
    if (ordersError) throw ordersError;

    if ((!orderRows || orderRows.length === 0) && userRole === "customer") {
      return handleSuccess(res, 200, "Anda belum memiliki pesanan.", []);
    }

    let fetchedOrders = await mapOrdersAsync(orderRows || []);

    if (userRole === "seller") {
      // Filter toko sudah dilakukan di SQL (contains shop_ids) — tidak perlu
      // filter ulang di JavaScript yang bisa menghilangkan pesanan karena
      // batas 50 order terbaru.
      if (fetchedOrders.length === 0) {
        return handleSuccess(
          res,
          200,
          "Tidak ada pesanan untuk toko Anda.",
          []
        );
      }

      // customerRingkas
      const customerIds = [...new Set(fetchedOrders.map((o) => o.user_id).filter(Boolean))];
      const customerCache = {};
      if (customerIds.length > 0) {
        const { data: customers } = await supabaseAdmin
          .from("profiles")
          .select("id, display_name")
          .in("id", customerIds);
        (customers || []).forEach((c) => {
          customerCache[c.id] = c.display_name;
        });
      }
      fetchedOrders = fetchedOrders.map((order) => ({
        ...order,
        customerRingkas: { displayName: customerCache[order.user_id] || null },
      }));
    } else if (userRole === "customer") {
      // shopRingkas
      const shopIds = [
        ...new Set(
          fetchedOrders
            .map((o) => o.items?.[0]?.shopId)
            .filter(Boolean)
        ),
      ];
      const shopCache = {};
      if (shopIds.length > 0) {
        const { data: shops } = await supabaseAdmin
          .from("shops")
          .select("id, shop_name")
          .in("id", shopIds);
        (shops || []).forEach((s) => {
          shopCache[s.id] = s.shop_name;
        });
      }
      fetchedOrders = fetchedOrders.map((order) => ({
        ...order,
        shopRingkas: { shopName: shopCache[order.items?.[0]?.shopId] || null },
      }));
    }

    return handleSuccess(
      res,
      200,
      "Daftar pesanan berhasil diambil.",
      fetchedOrders
    );
  } catch (error) {
    console.error("Error getting orders list:", error);
    return handleError(res, {
      statusCode: 500,
      message: "Gagal mengambil daftar pesanan.",
      detail: error.message,
    });
  }
};
