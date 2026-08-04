// src/services/CartService.js
import axios from "axios";

// Membaca base URL dari environment variable, fallback ke /api jika tidak ada
const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

/**
 * Adds an item to the cart.
 * @param {object} itemData - Data for the item to add.
 * @param {string} itemData.productId - The ID of the product.
 * @param {number} itemData.quantity - The quantity of the product.
 * @returns {Promise<object>} The API response.
 * @throws {Error} Error object from API or a default error object.
 */
const addItemToCart = async (itemData) => {
  if (
    !itemData ||
    !itemData.productId ||
    typeof itemData.quantity !== "number" ||
    itemData.quantity <= 0
  ) {
    // Throw a real Error object
    const err = new Error(
      "productId (string) dan quantity (angka positif) wajib diisi."
    );
    // @ts-ignore
    err.success = false;
    // @ts-ignore
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.post(`${BASE_URL}/cart/items`, itemData, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          "Terjadi kesalahan pada server saat menambahkan produk ke keranjang.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

/**
 * Gets the current user's cart.
 * @returns {Promise<object>} The API response.
 * @throws {object} Error object from API or a default error object.
 */
const getCart = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/cart`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    if (
      error.response &&
      error.response.status === 404 &&
      error.response.data &&
      error.response.data.message === "Keranjang tidak ditemukan atau kosong."
    ) {
      return {
        status: "success",
        message: "Keranjang Anda kosong.",
        data: {
          userId: error.response.data.userId || null,
          items: [],
          totalPrice: 0,
        },
      };
    }
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mengambil data keranjang.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

/**
 * Updates the quantity of an item in the cart.
 * @param {string} productId - The ID of the product to update.
 * @param {number} newQuantity - The new quantity for the product.
 * @returns {Promise<object>} The API response.
 * @throws {Error} Error object from API or a default error object.
 */
const updateCartItemQuantity = async (productId, newQuantity) => {
  if (!productId || typeof newQuantity !== "number" || newQuantity < 0) {
    // Throw a real Error object
    const err = new Error(
      "productId (string) dan newQuantity (angka non-negatif) wajib diisi."
    );
    // @ts-ignore
    err.success = false;
    // @ts-ignore
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.put(
      `${BASE_URL}/cart/items/${productId}`,
      { newQuantity },
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
          "Terjadi kesalahan pada server saat memperbarui kuantitas produk di keranjang.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

/**
 * Removes an item from the cart.
 * @param {string} productId - The ID of the product to remove.
 * @returns {Promise<object>} The API response.
 * @throws {Error} Error object from API or a default error object.
 */
const removeCartItem = async (productId) => {
  if (!productId) {
    // Throw a real Error object
    const err = new Error("productId (string) wajib diisi.");
    // @ts-ignore
    err.success = false;
    // @ts-ignore
    err.statusCode = 400;
    throw err;
  }
  try {
    const response = await axios.delete(`${BASE_URL}/cart/items/${productId}`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message:
          "Terjadi kesalahan pada server saat menghapus produk dari keranjang.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

/**
 * Clears all items from the cart.
 * @returns {Promise<object>} The API response.
 * @throws {object} Error object from API or a default error object.
 */
const clearCart = async () => {
  try {
    const response = await axios.delete(`${BASE_URL}/cart`, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    throw (
      error.response?.data || {
        success: false,
        message: "Terjadi kesalahan pada server saat mengosongkan keranjang.",
        statusCode: error.response?.status || 500,
      }
    );
  }
};

export {
  addItemToCart,
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
};
