import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  markConversationAsRead,
  clearChatbotHistory,
  getChatbotHistory,
} from "../services/ChatService";

vi.mock("axios");

describe("ChatService Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("markConversationAsRead", () => {
    it("melempar error jika conversationId tidak valid", async () => {
      await expect(markConversationAsRead("")).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(markConversationAsRead(null)).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it("memanggil endpoint PATCH /chat/conversations/:id/read dengan withCredentials", async () => {
      axios.patch.mockResolvedValueOnce({
        data: { success: true, message: "Percakapan ditandai sudah dibaca." },
      });

      const res = await markConversationAsRead("conv-123");
      expect(axios.patch).toHaveBeenCalledWith(
        expect.stringContaining("/chat/conversations/conv-123/read"),
        {},
        { withCredentials: true }
      );
      expect(res.success).toBe(true);
    });
  });

  describe("clearChatbotHistory", () => {
    it("memanggil endpoint DELETE /chatbot/history/clear dengan withCredentials", async () => {
      axios.delete.mockResolvedValueOnce({
        data: { success: true, message: "Riwayat chatbot berhasil dihapus." },
      });

      const res = await clearChatbotHistory();
      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining("/chatbot/history/clear"),
        { withCredentials: true }
      );
      expect(res.success).toBe(true);
    });
  });

  describe("getChatbotHistory", () => {
    it("memanggil endpoint GET /chatbot/history tanpa membutuhkan parameter userId", async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      const res = await getChatbotHistory();
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/chatbot/history"),
        { withCredentials: true }
      );
      expect(res.success).toBe(true);
    });
  });
});
