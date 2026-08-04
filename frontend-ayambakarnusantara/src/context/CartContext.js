// src/context/CartContext.js
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
} from "react";
import {
  getCart as apiGetCart,
  addItemToCart as apiAddItemToCart,
  updateCartItemQuantity as apiUpdateCartItemQuantity,
  removeCartItem as apiRemoveCartItem,
  clearCart as apiClearCart,
} from "../services/CartService";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { isLoggedIn } = useAuth();

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn) {
      setCart(null);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await apiGetCart();
      if (response.status === "success" || response.success === true) {
        setCart(response.data);
      } else if (
        response.message === "Keranjang Anda kosong." &&
        response.data
      ) {
        setCart(response.data);
      } else {
        setError(response.message || "Gagal memuat keranjang dari konteks.");
        setCart(null);
      }
    } catch (err) {
      if (err.message === "Keranjang Anda kosong." && err.data) {
        setCart(err.data);
      } else {
        setError(
          err.message ||
            "Terjadi kesalahan saat mengambil data keranjang dari konteks."
        );
        setCart(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    // Fetch keranjang saat status login berubah (misalnya setelah login) atau saat pertama kali provider dimuat jika sudah login
    if (isLoggedIn) {
      fetchCart();
    } else {
      setCart(null); // Kosongkan keranjang jika logout
    }
  }, [isLoggedIn, fetchCart]);

  const addItem = async (itemData) => {
    if (!isLoggedIn)
      throw new Error("Anda harus login untuk menambah item ke keranjang.");
    setIsLoading(true);
    try {
      const response = await apiAddItemToCart(itemData);
      if (response.status === "success" || response.success === true) {
        setCart(response.data);
        return response;
      } else {
        throw new Error(
          response.message || "Gagal menambahkan produk ke keranjang."
        );
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateItemQuantity = async (productId, newQuantity) => {
    // ... (mirip dengan addItem, panggil apiUpdateCartItemQuantity dan setCart)
    setIsLoading(true);
    try {
      const response = await apiUpdateCartItemQuantity(productId, newQuantity);
      if (response.status === "success" || response.success === true) {
        setCart(response.data);
        return response;
      } else {
        throw new Error(response.message || "Gagal update kuantitas.");
      }
    } catch (err) {
      setError(err.message);
      fetchCart(); // Re-fetch untuk sinkronisasi jika gagal
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (productId) => {
    // ... (mirip dengan addItem, panggil apiRemoveCartItem dan setCart)
    setIsLoading(true);
    try {
      const response = await apiRemoveCartItem(productId);
      if (response.status === "success" || response.success === true) {
        setCart(response.data);
        return response;
      } else {
        throw new Error(response.message || "Gagal menghapus item.");
      }
    } catch (err) {
      setError(err.message);
      fetchCart(); // Re-fetch
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearCartContext = async () => {
    if (!isLoggedIn) return; // Atau throw error
    setIsLoading(true);
    try {
      const response = await apiClearCart();
      if (response.status === "success" || response.success === true) {
        setCart(response.data); // Seharusnya keranjang kosong
        return response;
      } else {
        throw new Error(response.message || "Gagal mengosongkan keranjang.");
      }
    } catch (err) {
      setError(err.message);
      fetchCart(); // Re-fetch
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Hitung total item untuk ditampilkan di navbar, dll.
  const cartItemCount =
    cart?.items?.reduce((count, item) => count + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        fetchCart,
        addItem,
        updateItemQuantity,
        removeItem,
        clearCartContext,
        isLoading,
        error,
        cartItemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
