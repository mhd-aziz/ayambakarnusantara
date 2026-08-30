import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  createOrder,
  getUserOrders,
  cancelOrderAsCustomer,
  getSellerOrders,
  updateOrderStatusBySeller,
  confirmPaymentBySeller,
} from "../services/OrderService";

vi.mock("axios");

describe("OrderService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createOrder validasi paymentMethod", async () => {
    await expect(createOrder(null)).rejects.toThrow(/paymentMethod/);
    await expect(createOrder({ paymentMethod: "SALAH" })).rejects.toThrow(/tidak valid/);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("createOrder sukses", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true, data: { id: "o1" } } });
    const res = await createOrder({ paymentMethod: "PAY_AT_STORE" });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/order"),
      { paymentMethod: "PAY_AT_STORE" },
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("getUserOrders sukses", async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    const res = await getUserOrders();
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("/order"), {
      withCredentials: true,
    });
    expect(res.success).toBe(true);
  });

  it("cancelOrderAsCustomer validasi orderId", async () => {
    await expect(cancelOrderAsCustomer("")).rejects.toMatchObject({ statusCode: 400 });
    axios.patch.mockResolvedValueOnce({ data: { success: true } });
    const res = await cancelOrderAsCustomer("o1");
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining("/order/o1/cancel"),
      {},
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("getSellerOrders kirim params", async () => {
    axios.get.mockResolvedValueOnce({ data: { success: true, data: [] } });
    await getSellerOrders({ status: "CONFIRMED", customerSearch: "budi" });
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining("/order/seller/all"),
      expect.objectContaining({
        params: expect.any(URLSearchParams),
        withCredentials: true,
      })
    );
    const params = axios.get.mock.calls[0][1].params;
    expect(params.get("status")).toBe("CONFIRMED");
    expect(params.get("customerSearch")).toBe("budi");
  });

  it("updateOrderStatusBySeller validasi status", async () => {
    await expect(updateOrderStatusBySeller("o1", "SALAH")).rejects.toThrow(/tidak valid/);
    axios.patch.mockResolvedValueOnce({ data: { success: true } });
    const res = await updateOrderStatusBySeller("o1", "PROCESSING");
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringContaining("/order/o1/seller/status"),
      { newStatus: "PROCESSING" },
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("confirmPaymentBySeller validasi orderId", async () => {
    await expect(confirmPaymentBySeller("", new FormData())).rejects.toMatchObject({
      statusCode: 400,
    });
    axios.patch.mockResolvedValueOnce({ data: { success: true } });
    const fd = new FormData();
    const res = await confirmPaymentBySeller("o1", fd);
    expect(res.success).toBe(true);
  });
});
