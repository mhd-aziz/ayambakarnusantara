import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { registerUser } from "../services/AuthService";
import RegisterForm from "../components/Auth/RegisterForm";

jest.mock("../services/AuthService", () => ({
  registerUser: jest.fn(),
}));

jest.mock("../context/AuthContext", () => ({
  ...jest.requireActual("../context/AuthContext"),
  useAuth: jest.fn(),
}));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  Link: ({ to, children }) => <a href={to}>{children}</a>,
  useNavigate: () => jest.fn(),
}));

const TestWrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("Komponen RegisterForm", () => {
  let mockLogin;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin = jest.fn();
    useAuth.mockReturnValue({
      login: mockLogin,
    });
  });

  test("harus merender semua elemen form registrasi dengan benar", () => {
    render(<RegisterForm />, { wrapper: TestWrapper });
    expect(screen.getByText(/Buat Akun Baru/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nama Lengkap/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Alamat Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Nomor Telepon/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Alamat$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Register/i })
    ).toBeInTheDocument();
  });

  test("harus memperbarui semua input saat pengguna mengetik", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/Nama Lengkap/i), "Test User");
    await user.type(screen.getByLabelText(/Alamat Email/i), "test@example.com");
    await user.type(screen.getByLabelText(/Password/i), "password123");
    await user.type(screen.getByLabelText(/Nomor Telepon/i), "08123456789");
    await user.type(screen.getByLabelText(/^Alamat$/i), "Jl. Uji Coba No. 123");

    expect(screen.getByLabelText(/Nama Lengkap/i)).toHaveValue("Test User");
    expect(screen.getByLabelText(/Alamat Email/i)).toHaveValue(
      "test@example.com"
    );
    expect(screen.getByLabelText(/Password/i)).toHaveValue("password123");
    expect(screen.getByLabelText(/Nomor Telepon/i)).toHaveValue("08123456789");
    expect(screen.getByLabelText(/^Alamat$/i)).toHaveValue(
      "Jl. Uji Coba No. 123"
    );
  });

  test("harus menampilkan pesan error jika form dikirim dengan field wajib kosong", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: TestWrapper });
    const registerButton = screen.getByRole("button", { name: /Register/i });
    await user.click(registerButton);

    expect(
      await screen.findByText(/Email, password, dan nama lengkap wajib diisi./i)
    ).toBeInTheDocument();
  });

  test("harus memanggil service registrasi dan context login saat pengiriman data berhasil", async () => {
    const user = userEvent.setup();
    const mockUserData = {
      uid: "123",
      email: "test@example.com",
      displayName: "Test User",
    };
    registerUser.mockResolvedValue({
      success: true,
      message: "Registrasi berhasil!",
      user: mockUserData,
    });

    render(<RegisterForm />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/Nama Lengkap/i), "Test User");
    await user.type(screen.getByLabelText(/Alamat Email/i), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");

    const registerButton = screen.getByRole("button", { name: /Register/i });
    await user.click(registerButton);

    await waitFor(() => {
      expect(registerUser).toHaveBeenCalledTimes(1);
    });

    expect(registerUser).toHaveBeenCalledWith({
      displayName: "Test User",
      email: "test@example.com",
      password: "password123",
      phoneNumber: "",
      address: "",
    });

    expect(
      await screen.findByText(/Registrasi berhasil!/i)
    ).toBeInTheDocument();

    await waitFor(
      () => {
        expect(mockLogin).toHaveBeenCalledWith(mockUserData);
      },
      { timeout: 2000 }
    );
  });

  test("harus menampilkan pesan error dari API saat registrasi gagal", async () => {
    const user = userEvent.setup();
    const errorMessage = "Email sudah terdaftar.";
    registerUser.mockResolvedValue({
      success: false,
      message: errorMessage,
    });

    render(<RegisterForm />, { wrapper: TestWrapper });

    await user.type(screen.getByLabelText(/Nama Lengkap/i), "Test User");
    await user.type(screen.getByLabelText(/Alamat Email/i), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");

    const registerButton = screen.getByRole("button", { name: /Register/i });
    await user.click(registerButton);

    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test("harus dapat mengubah visibilitas password", async () => {
    const user = userEvent.setup();
    render(<RegisterForm />, { wrapper: TestWrapper });
    const passwordInput = screen.getByLabelText("Password");
    const toggleButton = screen.getByTitle(/Tampilkan password/i);

    expect(passwordInput).toHaveAttribute("type", "password");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "text");
    expect(toggleButton).toHaveAttribute("title", "Sembunyikan password");

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(toggleButton).toHaveAttribute("title", "Tampilkan password");
  });
});
