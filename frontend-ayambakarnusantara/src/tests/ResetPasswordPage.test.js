import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { resetPassword } from "../services/AuthService";
import ResetPasswordPage from "../pages/ResetPasswordPage";

vi.mock("../services/AuthService", async (importOriginal) => ({
  ...(await importOriginal()),
  resetPassword: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
  Link: ({ to, children }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

describe("Halaman ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.hash = "";
  });

  test("menampilkan pesan tautan tidak valid bila hash URL kosong", () => {
    render(<ResetPasswordPage />);
    expect(
      screen.getByText(/Tautan yang Anda buka tidak valid/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Minta Tautan Baru/i)).toBeInTheDocument();
  });

  test("menampilkan form password baru bila hash berisi token recovery", () => {
    window.location.hash =
      "#access_token=abc123&refresh_token=def456&type=recovery";
    render(<ResetPasswordPage />);
    expect(
      screen.getByLabelText(/^Password Baru$/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^Konfirmasi Password Baru$/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Simpan Password Baru/i })
    ).toBeInTheDocument();
  });

  test("menampilkan error bila password dan konfirmasi tidak sama", async () => {
    const user = userEvent.setup();
    window.location.hash =
      "#access_token=abc123&refresh_token=def456&type=recovery";
    render(<ResetPasswordPage />);

    const pw = screen.getByLabelText(/^Password Baru$/i);
    const confirm = screen.getByLabelText(/^Konfirmasi Password Baru$/i);
    await user.type(pw, "rahasia123");
    await user.type(confirm, "rahasia124");
    await user.click(
      screen.getByRole("button", { name: /Simpan Password Baru/i })
    );

    expect(
      await screen.findByText(/Password dan konfirmasi tidak sama/i)
    ).toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  test("memanggil resetPassword dan menampilkan pesan sukses", async () => {
    const user = userEvent.setup();
    window.location.hash =
      "#access_token=abc123&refresh_token=def456&type=recovery";
    resetPassword.mockResolvedValue({
      success: true,
      message: "Password berhasil diubah.",
    });
    render(<ResetPasswordPage />);

    const pw = screen.getByLabelText(/^Password Baru$/i);
    const confirm = screen.getByLabelText(/^Konfirmasi Password Baru$/i);
    await user.type(pw, "rahasia123");
    await user.type(confirm, "rahasia123");
    await user.click(
      screen.getByRole("button", { name: /Simpan Password Baru/i })
    );

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({
        accessToken: "abc123",
        refreshToken: "def456",
        newPassword: "rahasia123",
      });
    });
    expect(await screen.findByText(/Password berhasil diubah/i)).toBeInTheDocument();
  });
});
