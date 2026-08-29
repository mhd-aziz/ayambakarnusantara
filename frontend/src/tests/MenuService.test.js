import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { getProductRecommendations } from "../services/MenuService";

vi.mock("axios");

describe("MenuService Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getProductRecommendations", () => {
    it("memanggil endpoint GET /product/recommendations dengan parameter", async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            recommendations: [{ _id: "prod-1", name: "Ayam Bakar" }],
          },
        },
      });

      const res = await getProductRecommendations({ limit: 4 });
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining("/product/recommendations"),
        { params: { limit: 4 } }
      );
      expect(res.success).toBe(true);
      expect(res.data.recommendations).toHaveLength(1);
    });
  });
});
