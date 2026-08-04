import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";
const RATING_API_URL = `${BASE_URL}/rating`;

const addRating = async (productId, ratingData) => {
  if (!productId) {
    const err = new Error("productId wajib diisi untuk menambahkan rating.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  if (!ratingData || !ratingData.orderId || !ratingData.ratingValue) {
    const err = new Error("orderId dan ratingValue wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }

  try {
    const response = await axios.post(
      `${RATING_API_URL}/${productId}`,
      ratingData,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat menambahkan rating.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const getProductRatings = async (productId) => {
  if (!productId) {
    const err = new Error("productId wajib diisi untuk mengambil rating.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.get(`${RATING_API_URL}/${productId}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mengambil rating produk.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const updateRating = async (ratingId, ratingData) => {
  if (!ratingId) {
    const err = new Error("ratingId wajib diisi untuk memperbarui rating.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  if (!ratingData) {
    const err = new Error("Data rating wajib diisi.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.put(
      `${RATING_API_URL}/${ratingId}`,
      ratingData,
      {
        withCredentials: true,
      }
    );
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat memperbarui rating.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const deleteRating = async (ratingId) => {
  if (!ratingId) {
    const err = new Error("ratingId wajib diisi untuk menghapus rating.");
    err.success = false;
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.delete(`${RATING_API_URL}/${ratingId}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat menghapus rating.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

const getAllRatings = async (params = {}) => {
  try {
    const response = await axios.get(RATING_API_URL, {
      params,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mengambil semua rating.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

export {
  addRating,
  getProductRatings,
  updateRating,
  deleteRating,
  getAllRatings,
};
