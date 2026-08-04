// src/services/OrderService.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

const createOrder = async (orderData) => {
  if (!orderData || !orderData.paymentMethod) {
    const err = new Error("Metode pembayaran (paymentMethod) wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }

  if (
    orderData.paymentMethod !== "PAY_AT_STORE" &&
    orderData.paymentMethod !== "ONLINE_PAYMENT"
  ) {
    const err = new Error(
      "Metode pembayaran tidak valid. Gunakan 'PAY_AT_STORE' atau 'ONLINE_PAYMENT'."
    );
    err.success = false;
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await axios.post(`${BASE_URL}/order`, orderData, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

const getUserOrders = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/order`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

const getCustomerOrderDetailById = async (orderId) => {
  if (!orderId) {
    const err = new Error("orderId tidak boleh kosong.");
    err.isValidationError = true;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.get(`${BASE_URL}/order/customer/${orderId}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

const cancelOrderAsCustomer = async (orderId) => {
  if (!orderId) {
    const err = new Error(
      "orderId tidak boleh kosong untuk membatalkan pesanan."
    );
    err.isValidationError = true;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.patch(
      `${BASE_URL}/order/${orderId}/cancel`,
      {},
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

const getSellerOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.orderId) params.append("orderId", filters.orderId);
  if (filters.status && filters.status !== "ALL")
    params.append("status", filters.status);
  if (filters.customerUserId)
    params.append("customerUserId", filters.customerUserId);
  if (filters.customerSearch)
    params.append("customerSearch", filters.customerSearch);

  try {
    const response = await axios.get(`${BASE_URL}/order/seller/all`, {
      params,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    const defaultError = {
      success: false,
      message:
        error.message ||
        "Terjadi kesalahan pada server saat mengambil pesanan seller.",
      statusCode: error.response?.status || 500,
    };
    throw defaultError;
  }
};

const getSellerOrderDetailById = async (orderId) => {
  if (!orderId) {
    const err = new Error(
      "orderId tidak boleh kosong untuk mengambil detail pesanan seller."
    );
    err.isValidationError = true;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.get(`${BASE_URL}/order/seller/${orderId}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

const updateOrderStatusBySeller = async (orderId, status) => {
  if (!orderId) {
    const err = new Error(
      "orderId tidak boleh kosong untuk memperbarui status pesanan."
    );
    err.isValidationError = true;
    err.statusCode = 400;
    throw err;
  }
  const validStatuses = [
    "PROCESSING",
    "READY_FOR_PICKUP",
    "COMPLETED",
    "CONFIRMED",
  ];
  if (!status || !validStatuses.includes(status)) {
    const err = new Error(
      `Status pesanan tidak valid. Pilih dari: ${validStatuses.join(", ")}.`
    );
    err.isValidationError = true;
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await axios.patch(
      `${BASE_URL}/order/${orderId}/seller/status`,
      { newStatus: status },
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

const confirmPaymentBySeller = async (orderId, formData) => {
  if (!orderId) {
    const err = new Error(
      "orderId tidak boleh kosong untuk konfirmasi pembayaran."
    );
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.patch(
      `${BASE_URL}/order/${orderId}/seller/confirm-payment`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    const defaultError = {
      success: false,
      message:
        error.message ||
        "Terjadi kesalahan pada server saat konfirmasi pembayaran.",
      statusCode: error.response?.status || 500,
    };
    throw defaultError;
  }
};

const getOrderPaymentProofs = async (orderId) => {
  if (!orderId) {
    const err = new Error(
      "orderId tidak boleh kosong untuk mengambil bukti pembayaran."
    );
    err.isValidationError = true;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.get(
      `${BASE_URL}/order/${orderId}/payment-proofs`,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    const defaultError = {
      success: false,
      message:
        error.message ||
        "Terjadi kesalahan pada server saat mengambil bukti pembayaran.",
      statusCode: error.response?.status || 500,
    };
    throw defaultError;
  }
};

export {
  createOrder,
  getUserOrders,
  getCustomerOrderDetailById,
  cancelOrderAsCustomer,
  getSellerOrders,
  getSellerOrderDetailById,
  updateOrderStatusBySeller,
  confirmPaymentBySeller,
  getOrderPaymentProofs,
};
