import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  logoutUser,
} from "../services/AuthService";

vi.mock("axios");

describe("AuthService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registerUser: POST /auth/register withCredentials dan return data", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true, message: "ok" } });
    const res = await registerUser({ email: "a@b.com", password: "123456" });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/auth/register"),
      { email: "a@b.com", password: "123456" },
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("registerUser: lempar response.data saat error", async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { success: false, message: "Email sudah terdaftar" } },
    });
    await expect(registerUser({ email: "a@b.com", password: "x" })).rejects.toMatchObject({
      message: "Email sudah terdaftar",
    });
  });

  it("loginUser: POST /auth/login", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true, token: "t" } });
    const res = await loginUser({ email: "a@b.com", password: "123" });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      { email: "a@b.com", password: "123" },
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("forgotPassword: POST /auth/forgot-password", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const res = await forgotPassword({ email: "a@b.com" });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/auth/forgot-password"),
      { email: "a@b.com" }
    );
    expect(res.success).toBe(true);
  });

  it("resetPassword: POST /auth/reset-password dengan body lengkap", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const res = await resetPassword({
      accessToken: "at",
      refreshToken: "rt",
      newPassword: "Baru123!",
    });
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/auth/reset-password"),
      { accessToken: "at", refreshToken: "rt", newPassword: "Baru123!" },
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });

  it("logoutUser: POST /auth/logout", async () => {
    axios.post.mockResolvedValueOnce({ data: { success: true } });
    const res = await logoutUser();
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      {},
      { withCredentials: true }
    );
    expect(res.success).toBe(true);
  });
});
