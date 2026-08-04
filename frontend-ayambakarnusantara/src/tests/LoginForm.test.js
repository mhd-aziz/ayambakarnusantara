import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { loginUser } from "../services/AuthService";
import LoginForm from "../components/Auth/LoginForm";

jest.mock("../services/AuthService", () => ({
  loginUser: jest.fn(),
}));

jest.mock("../context/AuthContext", () => ({
  ...jest.requireActual("../context/AuthContext"),
  useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  Link: ({ to, children }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
}));

const TestWrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("Komponen LoginForm", () => {
  let mockLogin;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin = jest.fn();
    useAuth.mockReturnValue({
      login: mockLogin,
      isLoggedIn: false,
      isLoading: false,
      user: null,
    });
  });

  test("harus merender semua elemen form login dengan benar", () => {
    render(<LoginForm />, { wrapper: TestWrapper });
    expect(screen.getByText(/Selamat Datang/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Alamat Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Login/i })).toBeInTheDocument();
  });

  test("harus memperbarui input email dan password saat pengguna mengetik", async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: TestWrapper });
    const emailInput = screen.getByLabelText(/Alamat Email/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    await user.type(emailInput, "test@example.com");
    await user.type(passwordInput, "password123");
    expect(emailInput).toHaveValue("test@example.com");
    expect(passwordInput).toHaveValue("password123");
  });

  test("harus menampilkan pesan error jika form dikirim dalam keadaan kosong", async () => {
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: TestWrapper });
    const loginButton = screen.getByRole("button", { name: /Login/i });
    await user.click(loginButton);
    expect(
      await screen.findByText(/Email dan password wajib diisi./i)
    ).toBeInTheDocument();
  });

  test("harus memanggil service dan context login saat pengiriman data berhasil", async () => {
    const user = userEvent.setup();
    const mockUserData = {
      uid: "123",
      email: "test@example.com",
      displayName: "Test User",
    };
    loginUser.mockResolvedValue({
      success: true,
      user: mockUserData,
    });
    render(<LoginForm />, { wrapper: TestWrapper });
    await user.type(screen.getByLabelText(/Alamat Email/i), "test@example.com");
    await user.type(screen.getByLabelText(/Password/i), "password123");
    const loginButton = screen.getByRole("button", { name: /Login/i });
    await user.click(loginButton);
    await waitFor(() => {
      expect(loginUser).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockLogin).toHaveBeenCalledWith(mockUserData, {
        navigateAfterLogin: true,
        navigateTo: "/",
      });
    });
  });

  test("harus menampilkan pesan error saat upaya login gagal", async () => {
    const user = userEvent.setup();
    const errorMessage = "Login gagal. Periksa kembali kredensial Anda.";
    loginUser.mockResolvedValue({
      success: false,
      message: errorMessage,
    });
    render(<LoginForm />, { wrapper: TestWrapper });
    await user.type(
      screen.getByLabelText(/Alamat Email/i),
      "salah@example.com"
    );
    await user.type(screen.getByLabelText(/Password/i), "passwordSalah");
    const loginButton = screen.getByRole("button", { name: /Login/i });
    await user.click(loginButton);
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });
});
