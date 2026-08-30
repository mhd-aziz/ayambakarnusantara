import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  addItemToCart,
  getCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from "../services/CartService";

vi.mock("axios");

describe("CartService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("addItemToCart validasi input sebelum request", async () => {
    await expect(addItemToCart(null)).rejects.toThrow(/productId.*quantity/);
    await expect(addItemToCart({ productId: "p1", quantity: 0 })).rejects.toThrow();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("addItemToCart sukses POST /cart/items", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const res = await addItemToCart({ productId: "p1", quantity: 2 });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/cart/items"),
      { productId: "p1", quantity: 2 },
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("getCart normal dan fallback 404 kosong", async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, data: { items: [] } } });
    let res = await getCart();
    expect(res.success).toBe(true);

    axios.get.mockRejectedValueOnce({
      response: {
        status: 404,
        data: { message: "Keranjang tidak ditemukan atau kosong.", userId: "u1" },
      },
    });
    res = await getCart();
    expect(res.data.items).toEqual([]);
    expect(res.data.totalPrice).toBe(0);
  });

  it("updateCartItemQuantity validasi dan sukses", async () => {
    await expect(updateCartItemQuantity("", 1)).rejects.toThrow();
    axios.put.mockResolvedValueOnce({ data: { success: true } });
    const res = await updateCartItemQuantity("p1", 3);
    expect(axios.put).toHaveBeenCalledWith(
      expect.stringContaining("/cart/items/p1"),
      { newQuantity: 3 },
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("removeCartItem validasi dan sukses", async () => {
    await expect(removeCartItem("")).rejects.toThrow();
    axios.delete.mockResolvedValueOnce({ data: { success: true } });
    const res = await removeCartItem("p1");
    expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("/cart/items/p1"), {
      withCredentials: true,
    });
    expect(res.success).toBe(true);
  });

  it("clearCart sukses", async () => {
    axios.delete.mockResolvedValueOnce({ data: { success: true } });
    const res = await clearCart();
    expect(axios.delete).toHaveBeenCalledWith(expect.stringContaining("/cart"), {
      withCredentials: true,
    });
    expect(res.success).toBe(true);
  });
});
