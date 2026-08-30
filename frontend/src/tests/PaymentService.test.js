import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  createMidtransTransaction,
  retryMidtransPayment,
  getMidtransTransactionStatus,
} from "../services/PaymentService";

vi.mock("axios");

describe("PaymentService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createMidtransTransaction validasi orderId", async () => {
    await expect(createMidtransTransaction("")).rejects.toMatchObject({ statusCode: 400 });
    axios.post.mockResolvedValueOnce({ data: { success: true, snapToken: "t" } });
    const res = await createMidtransTransaction("o1");
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/payment/charge/o1"),
      {},
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("retryMidtransPayment validasi orderId", async () => {
    await expect(retryMidtransPayment(null)).rejects.toMatchObject({ statusCode: 400 });
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const res = await retryMidtransPayment("o1");
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/payment/retry/o1"),
      {},
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("getMidtransTransactionStatus validasi orderId", async () => {
    await expect(getMidtransTransactionStatus("")).rejects.toMatchObject({ statusCode: 400 });
    axios.get.mockResolvedValueOnce({ data: { success: true, data: { status: "pending" } } });
    const res = await getMidtransTransactionStatus("o1");
    expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("/payment/status/o1"), {
      withCredentials: true,
    });
    expect(res.success).toBe(true);
  });
});
