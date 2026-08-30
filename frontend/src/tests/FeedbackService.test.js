import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { sendFeedback } from "../services/FeedbackService";

vi.mock("axios");

describe("FeedbackService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validasi field wajib sebelum request", async () => {
    await expect(sendFeedback(null)).rejects.toThrow(/wajib diisi/);
    await expect(
      sendFeedback({ name: "A", email: "a@b.com", subject: "S", message: "" })
    ).rejects.toThrow();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("sukses POST /feedback", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const res = await sendFeedback({
      name: "A",
      email: "a@b.com",
      subject: "S",
      message: "halo",
    });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/feedback"),
      { name: "A", email: "a@b.com", subject: "S", message: "halo" },
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("lempar response.data saat error", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { success: false, message: "rate limit" } },
    });
    await expect(
      sendFeedback({ name: "A", email: "a@b.com", subject: "S", message: "halo" })
    ).rejects.toMatchObject({ message: "rate limit" });
  });
});
