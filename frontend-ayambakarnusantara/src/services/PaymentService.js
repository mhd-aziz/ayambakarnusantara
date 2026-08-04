// src/services/PaymentService.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

const createMidtransTransaction = async (orderId) => {
  if (!orderId) {
    const err = new Error(
      "orderId tidak boleh kosong untuk membuat transaksi pembayaran."
    );
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.post(
      `${BASE_URL}/payment/charge/${orderId}`,
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

const retryMidtransPayment = async (orderId) => {
  if (!orderId) {
    const err = new Error(
      "orderId tidak boleh kosong untuk mencoba ulang pembayaran."
    );
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.post(
      `${BASE_URL}/payment/retry/${orderId}`,
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

const getMidtransTransactionStatus = async (orderId) => {
  if (!orderId) {
    const err = new Error(
      "orderId tidak boleh kosong untuk mendapatkan status transaksi."
    );
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.get(`${BASE_URL}/payment/status/${orderId}`, {
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

export {
  createMidtransTransaction,
  retryMidtransPayment,
  getMidtransTransactionStatus,
};
