// src/services/MenuService.js
import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

const getProducts = async (params = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/product`, {
      params,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

const getProductById = async (productId) => {
  if (!productId) {
    const err = new Error("productId tidak boleh kosong.");
    throw err;
  }
  try {
    const response = await axios.get(`${BASE_URL}/product/${productId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

const createProduct = async (productData) => {
  try {
    const response = await axios.post(`${BASE_URL}/product`, productData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
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

const updateProduct = async (productId, productUpdateData) => {
  if (!productId) {
    const err = new Error(
      "productId tidak boleh kosong untuk memperbarui produk."
    );
    throw err;
  }
  try {
    const response = await axios.put(
      `${BASE_URL}/product/${productId}`,
      productUpdateData,
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
    throw error;
  }
};

const deleteProduct = async (productId) => {
  if (!productId) {
    const err = new Error(
      "productId tidak boleh kosong untuk menghapus produk."
    );
    throw err;
  }
  try {
    const response = await axios.delete(`${BASE_URL}/product/${productId}`, {
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

const getMyProducts = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/product/my-products`, {
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
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
};
