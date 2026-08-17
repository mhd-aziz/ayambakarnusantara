require("dotenv").config();
const crypto = require("crypto");
const { supabaseAdmin } = require("../config/supabaseConfig");
const snap = require("../config/midtransConfig");
const { handleSuccess, handleError } = require("../utils/responseHandler");
const { sendNotification } = require("./notificationController");

const getCallbackUrl = (req) => {
  const allowedOriginsString = process.env.CORS_ALLOWED_ORIGINS || "";
  const allowedOrigins = allowedOriginsString
    .split(",")
    .map((origin) => origin.trim());

  const requestOrigin = req.get("origin");

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  if (allowedOrigins.length > 0 && allowedOrigins[0]) {
    return allowedOrigins[0];
  }
  console.warn(
    "PERINGATAN: CORS_ALLOWED_ORIGINS tidak diatur. Menggunakan fallback 'http://localhost:3000'"
  );
  return "http://localhost:3000";
};

async function getOrderRow(orderId) {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

exports.createMidtransTransaction = async (req, res) => {
  const customerId = req.user?.uid;
  const { orderId } = req.params;
  const CALLBACK_BASE_URL = getCallbackUrl(req);

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
    const orderData = await getOrderRow(orderId);
    if (!orderData) {
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    if (orderData.user_id !== customerId) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda tidak berhak melakukan pembayaran untuk pesanan ini.",
      });
    }
    const pd = orderData.payment_details || {};
    if ((pd.method || "").toUpperCase() !== "ONLINE_PAYMENT") {
      return handleError(res, {
        statusCode: 400,
        message: "Metode pembayaran pesanan ini bukan ONLINE_PAYMENT.",
      });
    }

    if (
      pd.midtransSnapToken &&
      pd.midtransRedirectUrl &&
      (orderData.order_status === "AWAITING_PAYMENT" ||
        orderData.order_status === "PAYMENT_FAILED")
    ) {
      console.log(
        `[PaymentController] Reusing existing Snap token for orderId: ${orderId}`
      );
      return handleSuccess(
        res,
        200,
        "Transaksi pembayaran sudah ada, silakan lanjutkan.",
        {
          token: pd.midtransSnapToken,
          redirect_url: pd.midtransRedirectUrl,
          orderId,
        }
      );
    }

    if (
      orderData.order_status !== "AWAITING_PAYMENT" &&
      orderData.order_status !== "PAYMENT_FAILED"
    ) {
      if (pd.status === "paid") {
        return handleError(res, {
          statusCode: 400,
          message: "Pesanan ini sudah dibayar.",
        });
      }
      return handleError(res, {
        statusCode: 400,
        message: `Pesanan dengan status "${orderData.order_status}" tidak dapat diproses untuk pembayaran baru.`,
      });
    }

    const { data: customerUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("display_name, email, phone_number")
      .eq("id", customerId)
      .maybeSingle();

    if (userError) throw userError;

    if (!customerUser) {
      return handleError(res, {
        statusCode: 404,
        message: "Data customer tidak ditemukan.",
      });
    }
    const nameParts = customerUser.display_name
      ? customerUser.display_name.split(" ")
      : ["Pelanggan"];
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const midtransOrderIdForGateway = `${orderId}-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderIdForGateway,
        gross_amount: Number(orderData.total_price),
      },
      item_details: orderData.items.map((item) => ({
        id: item.productId,
        price: item.price,
        quantity: item.quantity,
        name: item.name.substring(0, 50),
      })),
      customer_details: {
        first_name: firstName,
        last_name: lastName,
        email: customerUser.email,
        phone: customerUser.phone_number || undefined,
      },
      callbacks: {
        finish: `${CALLBACK_BASE_URL}/pesanan/${orderId}?payment_status=finish&transaction_id=${midtransOrderIdForGateway}`,
        unfinish: `${CALLBACK_BASE_URL}/pesanan/${orderId}?payment_status=unfinish&transaction_id=${midtransOrderIdForGateway}`,
        error: `${CALLBACK_BASE_URL}/pesanan/${orderId}?payment_status=error&transaction_id=${midtransOrderIdForGateway}`,
      },
    };

    console.log(
      "[PaymentController] Creating payment gateway transaction with params:",
      JSON.stringify(parameter, null, 2)
    );
    const transaction = await snap.createTransaction(parameter);
    const { token, redirect_url } = transaction;

    const newPd = {
      ...pd,
      midtransSnapToken: token,
      midtransRedirectUrl: redirect_url,
      midtransOrderId: midtransOrderIdForGateway,
      status: "pending_gateway_payment",
    };

    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        payment_details: newPd,
        order_status: "AWAITING_PAYMENT",
      })
      .eq("id", orderId);
    if (updateError) throw updateError;

    console.log(
      `[PaymentController] Payment gateway transaction created for orderId: ${orderId}, Gateway Order ID: ${midtransOrderIdForGateway}, Token: ${token}`
    );
    return handleSuccess(
      res,
      201,
      "Transaksi pembayaran berhasil dibuat. Anda akan diarahkan ke halaman pembayaran.",
      { token, redirect_url, orderId }
    );
  } catch (error) {
    console.error(
      "[PaymentController] Error creating payment gateway transaction:",
      error.message ? JSON.stringify(error.message) : error
    );

    let userFacingErrorMessage =
      "Gagal membuat transaksi pembayaran. Silakan coba lagi.";
    let responseStatusCode = 500;

    if (error.ApiResponse && error.ApiResponse.status_message) {
      userFacingErrorMessage = error.ApiResponse.status_message;
      responseStatusCode = error.ApiResponse.status_code || responseStatusCode;
    } else if (error.message) {
      try {
        const parsedError = JSON.parse(error.message);
        if (
          parsedError &&
          parsedError.error_messages &&
          parsedError.error_messages.length > 0
        ) {
          userFacingErrorMessage = parsedError.error_messages.join(", ");
        } else if (parsedError && parsedError.status_message) {
          userFacingErrorMessage = parsedError.status_message;
        } else if (
          typeof error.message === "string" &&
          !error.message.startsWith("{")
        ) {
          userFacingErrorMessage = error.message;
        }
        if (error.httpStatusCode) responseStatusCode = error.httpStatusCode;
      } catch (e) {
        if (typeof error.message === "string" && error.message.length < 200) {
          userFacingErrorMessage = error.message;
        }
      }
    }

    return handleError(res, {
      statusCode: responseStatusCode,
      message: `Gagal membuat transaksi pembayaran: ${userFacingErrorMessage}`,
    });
  }
};

exports.getMidtransTransactionStatus = async (req, res) => {
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
    const orderData = await getOrderRow(orderId);
    if (!orderData) {
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    if (orderData.user_id !== customerId) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda tidak berhak melihat status pembayaran pesanan ini.",
      });
    }

    const pd = orderData.payment_details || {};
    if ((pd.method || "").toUpperCase() !== "ONLINE_PAYMENT") {
      return handleError(res, {
        statusCode: 400,
        message: "Pesanan ini tidak menggunakan metode pembayaran online.",
      });
    }

    const gatewayAssignedOrderId = pd.gatewayAssignedOrderId || pd.midtransOrderId;

    if (!gatewayAssignedOrderId) {
      return handleError(res, {
        statusCode: 404,
        message:
          "Informasi transaksi pembayaran tidak ditemukan untuk pesanan ini. Mohon untuk lakukan pembayaran segera agar dapat di proses pesanan Anda.",
      });
    }

    console.log(
      `[PaymentController] Getting payment gateway status for gateway-assigned order_id: ${gatewayAssignedOrderId} (Our orderId: ${orderId})`
    );
    const paymentGatewayStatusResponse = await snap.transaction.status(
      gatewayAssignedOrderId
    );
    console.log(
      "[PaymentController] Payment gateway status response:",
      paymentGatewayStatusResponse
    );

    const currentInternalPaymentStatus = pd.status;
    const currentInternalOrderStatus = orderData.order_status;
    // Penjaga terminal: order yang sudah lunas ("paid") TIDAK BOLEH
    // diturunkan statusnya oleh respons pending/deny/expire/cancel
    // (polling status bisa kembali tidak berurutan setelah pembayaran lunas).
    const isOrderAlreadyPaid = currentInternalPaymentStatus === "paid";
    // Penjaga status terminal (sama dgn webhook) — T4 REVIEW-2026-08-17:
    // order CANCELLED/COMPLETED tidak boleh dihidupkan lagi oleh polling telat.
    const isTerminalOrderState =
      currentInternalOrderStatus === "CANCELLED" ||
      currentInternalOrderStatus === "COMPLETED";

    let needsUpdate = false;
    let newPd = { ...pd };
    let newOrderStatus = orderData.order_status;

    const { transaction_status, fraud_status, payment_type, transaction_id } =
      paymentGatewayStatusResponse;

    if (!isOrderAlreadyPaid && !isTerminalOrderState) {
      if (transaction_status === "capture") {
        if (
          fraud_status === "accept" &&
          currentInternalPaymentStatus !== "paid"
        ) {
          newOrderStatus = "PROCESSING";
          newPd.status = "paid";
          needsUpdate = true;
        }
      } else if (
        transaction_status === "settlement" &&
        currentInternalPaymentStatus !== "paid"
      ) {
        newOrderStatus = "PROCESSING";
        newPd.status = "paid";
        needsUpdate = true;
      } else if (
        transaction_status === "pending" &&
        currentInternalPaymentStatus !== "pending_gateway_payment"
      ) {
        newOrderStatus = "AWAITING_PAYMENT";
        newPd.status = "pending_gateway_payment";
        needsUpdate = true;
      } else if (
        (transaction_status === "deny" ||
          transaction_status === "expire" ||
          transaction_status === "cancel") &&
        currentInternalOrderStatus !== "PAYMENT_FAILED"
      ) {
        newOrderStatus = "PAYMENT_FAILED";
        newPd.status = transaction_status;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      newPd.gatewayTransactionId =
        transaction_id || pd.gatewayTransactionId;
      newPd.paymentType = payment_type || pd.paymentType;

      console.log(
        `[PaymentController] Syncing order ${orderId} status with payment gateway response. Updates:`,
        { order_status: newOrderStatus, payment_details: newPd }
      );

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ order_status: newOrderStatus, payment_details: newPd })
        .eq("id", orderId);
      if (updateError) throw updateError;
    }

    const finalOrderData = await getOrderRow(orderId);

    let successMessageUserFacing;

    switch (transaction_status) {
      case "pending":
        successMessageUserFacing =
          "Pembayaran Anda sedang menunggu penyelesaian. Harap lakukan pembayaran jika belum.";
        break;
      case "expire":
        successMessageUserFacing =
          "Waktu pembayaran telah habis. Silakan coba lakukan pembayaran lagi jika pesanan masih diinginkan.";
        break;
      case "cancel":
        successMessageUserFacing =
          "Pembayaran telah dibatalkan. Anda dapat mencoba melakukan pembayaran lagi jika diperlukan.";
        break;
      case "deny":
        successMessageUserFacing = "Pembayaran ditolak oleh penyedia layanan.";
        break;
      case "settlement":
      case "capture":
        successMessageUserFacing = "Pembayaran berhasil dan telah diterima.";
        break;
      default:
        successMessageUserFacing = `Status transaksi: ${transaction_status}.`;
    }

    if (needsUpdate) {
      successMessageUserFacing += " Status pesanan Anda juga telah diperbarui.";
    }

    const finalPd = finalOrderData.payment_details || {};

    return handleSuccess(res, 200, successMessageUserFacing, {
      paymentGatewayStatus: paymentGatewayStatusResponse,
      internalOrderStatus: finalOrderData.order_status,
      internalPaymentStatus: finalPd.status,
      orderId,
    });
  } catch (error) {
    console.error(
      "[PaymentController] DETAILED Error getting payment gateway transaction status:",
      "\nError Object:",
      error,
      "\nError Message:",
      error.message || "N/A",
      "\nGateway HTTP Status Code:",
      error.httpStatusCode || "N/A",
      "\nGateway API Response:",
      error.ApiResponse || "N/A",
      "\nStack Trace:",
      error.stack
    );

    let userFacingErrorMessage =
      "Terjadi kesalahan saat memeriksa status pembayaran Anda. Silakan coba lagi nanti.";
    let responseStatusCode = 500;

    if (error.ApiResponse && typeof error.ApiResponse === "object") {
      responseStatusCode =
        parseInt(error.ApiResponse.status_code, 10) || responseStatusCode;
      let apiResponseMessage =
        error.ApiResponse.status_message ||
        (Array.isArray(error.ApiResponse.error_messages)
          ? error.ApiResponse.error_messages.join(", ")
          : null);

      if (responseStatusCode === 404) {
        userFacingErrorMessage =
          "Transaksi pembayaran tidak ditemukan, Pastikan anda sudah membayar nya";
      } else if (responseStatusCode === 401) {
        userFacingErrorMessage =
          "Gagal otentikasi dengan sistem pembayaran. Harap hubungi administrator.";
        responseStatusCode = 500;
      } else if (responseStatusCode >= 500) {
        userFacingErrorMessage =
          "Sistem pembayaran sedang mengalami gangguan. Silakan coba beberapa saat lagi.";
      } else if (apiResponseMessage) {
        userFacingErrorMessage = `Gagal memuat status: ${apiResponseMessage}`;
      } else {
        userFacingErrorMessage =
          "Gagal memuat status pembayaran karena respons tidak dikenal dari sistem pembayaran.";
      }
    } else if (error.message) {
      try {
        const parsedError = JSON.parse(error.message);
        responseStatusCode =
          parseInt(parsedError.status_code, 10) ||
          error.httpStatusCode ||
          responseStatusCode;
        let parsedMessage =
          parsedError.status_message ||
          (Array.isArray(parsedError.error_messages)
            ? parsedError.error_messages.join(", ")
            : null);

        if (responseStatusCode === 404) {
          userFacingErrorMessage =
            "Transaksi pembayaran tidak ditemukan. Pastikan pembayaran telah diinisiasi.";
        } else if (responseStatusCode === 401) {
          userFacingErrorMessage =
            "Masalah otentikasi dengan layanan pembayaran. Hubungi dukungan.";
          responseStatusCode = 500;
        } else if (responseStatusCode >= 500) {
          userFacingErrorMessage =
            "Layanan pembayaran sedang gangguan. Coba lagi nanti.";
        } else if (parsedMessage) {
          userFacingErrorMessage = parsedMessage;
        } else if (
          typeof error.message === "string" &&
          !error.message.toLowerCase().includes("unexpected token")
        ) {
          userFacingErrorMessage = error.message;
        }
      } catch (e) {
        if (typeof error.message === "string") {
          if (
            error.message.toLowerCase().includes("fetch failed") ||
            error.message.toLowerCase().includes("network error") ||
            error.message.toLowerCase().includes("socket hang up")
          ) {
            userFacingErrorMessage =
              "Tidak dapat terhubung ke layanan pembayaran. Periksa koneksi internet Anda atau coba lagi nanti.";
            responseStatusCode = 503;
          } else if (
            error.message.length < 200 &&
            !error.message.toLowerCase().includes("unexpected token")
          ) {
            userFacingErrorMessage = error.message;
          } else {
            userFacingErrorMessage =
              "Terjadi kesalahan internal saat memproses permintaan status pembayaran.";
          }
        }
      }
    }

    return handleError(res, {
      statusCode: responseStatusCode,
      message: userFacingErrorMessage,
    });
  }
};

exports.retryMidtransPayment = async (req, res) => {
  const customerId = req.user?.uid;
  const { orderId } = req.params;
  const CALLBACK_BASE_URL = getCallbackUrl(req);
  console.log(
    `[PaymentController] Attempting to RETRY payment gateway transaction for orderId: ${orderId}, customerId: ${customerId}`
  );

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
    const orderData = await getOrderRow(orderId);
    if (!orderData) {
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    if (orderData.user_id !== customerId) {
      return handleError(res, {
        statusCode: 403,
        message: "Anda tidak berhak melakukan pembayaran ulang untuk pesanan ini.",
      });
    }

    const pd = orderData.payment_details || {};
    if ((pd.method || "").toUpperCase() !== "ONLINE_PAYMENT") {
      return handleError(res, {
        statusCode: 400,
        message: "Metode pembayaran pesanan ini bukan ONLINE_PAYMENT.",
      });
    }

    if (
      orderData.order_status !== "AWAITING_PAYMENT" &&
      orderData.order_status !== "PAYMENT_FAILED"
    ) {
      return handleError(res, {
        statusCode: 400,
        message: `Pesanan dengan status "${orderData.order_status}" tidak dapat di-retry.`,
      });
    }

    console.log(
      `[PaymentController-Retry] Order ${orderId} loaded successfully for customer ${customerId}`
    );

    const { data: customerUser, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("display_name, email, phone_number")
      .eq("id", customerId)
      .maybeSingle();

    if (userError) throw userError;

    if (!customerUser) {
      console.log(
        `[PaymentController-Retry] Customer user document not found for ${customerId}`
      );
      return handleError(res, {
        statusCode: 404,
        message: "Data customer tidak ditemukan.",
      });
    }
    const nameParts = customerUser.display_name
      ? customerUser.display_name.split(" ")
      : ["Pelanggan"];
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    const midtransOrderIdForGateway = `${orderId}-RETRY-${Date.now()}`;
    console.log(
      `[PaymentController-Retry] Generated NEW Gateway Order ID: ${midtransOrderIdForGateway}`
    );

    const parameter = {
      transaction_details: {
        order_id: midtransOrderIdForGateway,
        gross_amount: Number(orderData.total_price),
      },
      item_details: orderData.items.map((item) => ({
        id: item.productId,
        price: item.price,
        quantity: item.quantity,
        name: item.name.substring(0, 50),
      })),
      customer_details: {
        first_name: firstName,
        last_name: lastName,
        email: customerUser.email,
        phone: customerUser.phone_number || undefined,
      },
      callbacks: {
        finish: `${CALLBACK_BASE_URL}/pesanan/${orderId}?payment_status=finish&transaction_id=${midtransOrderIdForGateway}`,
        unfinish: `${CALLBACK_BASE_URL}/pesanan/${orderId}?payment_status=unfinish&transaction_id=${midtransOrderIdForGateway}`,
        error: `${CALLBACK_BASE_URL}/pesanan/${orderId}?payment_status=error&transaction_id=${midtransOrderIdForGateway}`,
      },
    };
    console.log(
      "[PaymentController-Retry] Payment gateway transaction parameter prepared:",
      JSON.stringify(parameter)
    );

    console.log("[PaymentController-Retry] Calling snap.createTransaction...");
    const transaction = await snap.createTransaction(parameter);
    console.log(
      "[PaymentController-Retry] Payment gateway transaction (retry) created successfully:",
      transaction
    );
    const { token, redirect_url } = transaction;

    const newPd = {
      ...pd,
      midtransSnapToken: token,
      midtransRedirectUrl: redirect_url,
      midtransOrderId: midtransOrderIdForGateway,
      status: "pending_gateway_payment",
    };

    const updateFieldsRetry = {
      payment_details: newPd,
      order_status:
        orderData.order_status === "PAYMENT_FAILED"
          ? "AWAITING_PAYMENT"
          : orderData.order_status,
    };

    console.log(
      `[PaymentController-Retry] Updating order ${orderId} with new payment gateway info.`
    );
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(updateFieldsRetry)
      .eq("id", orderId);
    if (updateError) throw updateError;
    console.log(
      `[PaymentController-Retry] Order ${orderId} updated for retry.`
    );

    return handleSuccess(
      res,
      201,
      "Transaksi pembayaran ulang berhasil dibuat. Anda akan diarahkan ke halaman pembayaran.",
      { token, redirect_url, orderId }
    );
  } catch (error) {
    console.error(
      "[PaymentController-Retry] Error creating retry payment gateway transaction:",
      error.message ? JSON.stringify(error.message) : error
    );

    let userFacingErrorMessage =
      "Gagal membuat transaksi pembayaran ulang. Silakan coba lagi.";
    let responseStatusCode = 500;

    if (error.ApiResponse && error.ApiResponse.status_message) {
      userFacingErrorMessage = error.ApiResponse.status_message;
      responseStatusCode = error.ApiResponse.status_code || responseStatusCode;
    } else if (error.message) {
      try {
        const parsedError = JSON.parse(error.message);
        if (
          parsedError &&
          parsedError.error_messages &&
          parsedError.error_messages.length > 0
        ) {
          userFacingErrorMessage = parsedError.error_messages.join(", ");
        } else if (parsedError && parsedError.status_message) {
          userFacingErrorMessage = parsedError.status_message;
        } else if (
          typeof error.message === "string" &&
          !error.message.startsWith("{")
        ) {
          userFacingErrorMessage = error.message;
        }
        if (error.httpStatusCode) responseStatusCode = error.httpStatusCode;
      } catch (e) {
        if (typeof error.message === "string" && error.message.length < 200) {
          userFacingErrorMessage = error.message;
        }
      }
    }

    return handleError(res, {
      statusCode: responseStatusCode,
      message: `Gagal membuat transaksi pembayaran ulang: ${userFacingErrorMessage}`,
    });
  }
};

/**
 * Webhook notifikasi dari Midtrans (Payment Notification).
 * Dipanggil SERVER Midtrans, bukan dari frontend → TANPA authenticateToken.
 * Verifikasi signature_key (sha512) → sinkronkan order → kirim notifikasi customer.
 * Idempotent: aman jika Midtrans mengirim notifikasi berulang.
 */
exports.handlePaymentNotification = async (req, res) => {
  try {
    const notification = req.body || {};

    const {
      order_id: gatewayOrderId,
      status_code,
      gross_amount,
      transaction_status,
      fraud_status,
      payment_type,
      transaction_id,
      signature_key,
    } = notification;

    if (!gatewayOrderId || !signature_key) {
      return handleError(res, {
        statusCode: 400,
        message: "Payload notifikasi tidak valid.",
      });
    }

    // 1. Verifikasi signature: sha512(order_id + status_code + gross_amount + server_key)
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    const expectedSignature = crypto
      .createHash("sha512")
      .update(
        `${gatewayOrderId}${status_code || ""}${gross_amount || ""}${serverKey}`
      )
      .digest("hex");

    if (expectedSignature !== signature_key) {
      console.warn(
        `[PaymentWebhook] Signature tidak valid untuk order_id: ${gatewayOrderId}`
      );
      return handleError(res, {
        statusCode: 403,
        message: "Signature tidak valid.",
      });
    }

    // 2. Mapping gatewayOrderId -> orderId internal.
    //    Format gateway: "<orderId>-<timestamp>" (pembayaran pertama) atau
    //    "<orderId>-RETRY-<timestamp>" (pembayaran ulang). Timestamp selalu
    //    angka; potong dari belakang: buang "-<angka>", lalu bila sebelumnya
    //    ada marker "-RETRY", buang juga. Aman karena id internal uuid —
    //    hanya akhiran yang dipotong, bukan pemenggalan di tengah.
    const gatewayParts = gatewayOrderId.split("-");
    if (
      gatewayParts.length > 1 &&
      /^\d+$/.test(gatewayParts[gatewayParts.length - 1])
    ) {
      gatewayParts.pop(); // buang timestamp
      if (gatewayParts[gatewayParts.length - 1] === "RETRY") {
        gatewayParts.pop(); // buang marker retry
      }
    }
    const orderId = gatewayParts.join("-");

    const orderData = await getOrderRow(orderId);
    if (!orderData) {
      console.warn(`[PaymentWebhook] Order tidak ditemukan: ${orderId}`);
      return handleError(res, {
        statusCode: 404,
        message: "Pesanan tidak ditemukan.",
      });
    }

    const pd = orderData.payment_details || {};
    if ((pd.method || "").toUpperCase() !== "ONLINE_PAYMENT") {
      return handleSuccess(res, 200, "OK — bukan pesanan online payment.");
    }

    // 3. Sinkronkan status (pola sama dengan getMidtransTransactionStatus)
    const currentPaymentStatus = pd.status;
    // Penjaga terminal: order yang sudah lunas ("paid") TIDAK BOLEH
    // diturunkan statusnya oleh notifikasi pending/deny/expire/cancel yang
    // datang telat, duplikat, atau tidak berurutan dari Midtrans.
    const isOrderAlreadyPaid = currentPaymentStatus === "paid";
    // Penjaga status terminal: order yang sudah CANCELLED (batal oleh pembeli)
    // atau COMPLETED tidak boleh "dihidupkan lagi" oleh notifikasi settlement
    // yang datang telat. cancel_order menaruh payment_details.status =
    // "cancelled_by_user" (bukan "paid"), jadi guard isOrderAlreadyPaid saja
    // tidak cukup — T4 REVIEW-2026-08-17.
    const isTerminalOrderState =
      orderData.order_status === "CANCELLED" ||
      orderData.order_status === "COMPLETED";
    let needsUpdate = false;
    let newPd = { ...pd };
    let newOrderStatus = orderData.order_status;

    if (!isOrderAlreadyPaid && !isTerminalOrderState) {
      if (transaction_status === "capture") {
        if (fraud_status === "accept" && currentPaymentStatus !== "paid") {
          newOrderStatus = "PROCESSING";
          newPd.status = "paid";
          needsUpdate = true;
        }
      } else if (
        transaction_status === "settlement" &&
        currentPaymentStatus !== "paid"
      ) {
        newOrderStatus = "PROCESSING";
        newPd.status = "paid";
        needsUpdate = true;
      } else if (
        transaction_status === "pending" &&
        currentPaymentStatus !== "pending_gateway_payment"
      ) {
        newOrderStatus = "AWAITING_PAYMENT";
        newPd.status = "pending_gateway_payment";
        needsUpdate = true;
      } else if (
        (transaction_status === "deny" ||
          transaction_status === "expire" ||
          transaction_status === "cancel") &&
        orderData.order_status !== "PAYMENT_FAILED"
      ) {
        newOrderStatus = "PAYMENT_FAILED";
        newPd.status = transaction_status;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      newPd.gatewayTransactionId = transaction_id || pd.gatewayTransactionId;
      newPd.paymentType = payment_type || pd.paymentType;

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ order_status: newOrderStatus, payment_details: newPd })
        .eq("id", orderId);
      if (updateError) throw updateError;

      // Notifikasi customer saat pembayaran diterima
      if (newPd.status === "paid") {
        try {
          await sendNotification({
            userId: orderData.user_id,
            title: "Pembayaran Diterima!",
            body: `Pembayaran pesanan #${orderId.substring(
              0,
              20
            )} telah diterima. Pesanan sedang diproses penjual.`,
            data: { orderId, type: "PAYMENT_CONFIRMED" },
          });
        } catch (notifError) {
          console.error(
            "Gagal kirim notifikasi pembayaran diterima:",
            notifError
          );
        }
      }
    }

    console.log(
      `[PaymentWebhook] Order ${orderId} disinkronkan: ${orderData.order_status} -> ${newOrderStatus} (gateway: ${transaction_status})`
    );

    return handleSuccess(res, 200, "Notifikasi diterima dan diproses.");
  } catch (error) {
    console.error("[PaymentWebhook] Error:", error);
    return handleError(res, {
      statusCode: 500,
      message: `Gagal memproses notifikasi: ${error.message || ""}`.trim(),
    });
  }
};
