import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import CartPage from "../pages/CartPage";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/OrderService";

jest.mock("../context/AuthContext");
jest.mock("../context/CartContext");
jest.mock("../services/OrderService");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockUser = {
  uid: "test-user-123",
  displayName: "Pelanggan Uji",
};

const mockCart = {
  items: [
    {
      productId: "prod-1",
      name: "Ayam Bakar Madu",
      quantity: 2,
      price: 25000,
      subtotal: 50000,
      productImageURL: "image1.jpg",
      shopId: "shop-1",
      shopName: "Toko Ayam Enak",
    },
  ],
  totalPrice: 50000,
};

const renderCartPage = (cartData = mockCart) => {
  useAuth.mockReturnValue({
    isLoggedIn: true,
    user: mockUser,
    isLoading: false,
  });

  const mockClearCart = jest
    .fn()
    .mockResolvedValue({ success: true, data: { items: [], totalPrice: 0 } });

  useCart.mockReturnValue({
    cart: cartData,
    isLoading: false,
    error: null,
    fetchCart: jest.fn(),
    clearCartContext: mockClearCart,
    updateItemQuantity: jest.fn(),
    removeItem: jest.fn(),
  });

  render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  );

  return { mockClearCart };
};

describe("Alur Checkout di Halaman Keranjang", () => {
  let originalWarn;

  beforeAll(() => {
    originalWarn = console.warn;
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.warn = originalWarn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("berhasil membuat pesanan dan mengarahkan pengguna saat checkout valid", async () => {
    const user = userEvent.setup();
    createOrder.mockResolvedValue({
      success: true,
      message: "Pesanan #mock-order-id berhasil dibuat!",
      data: { orderId: "mock-order-id" },
    });

    const { mockClearCart } = renderCartPage();

    const confirmButton = screen.getByRole("button", {
      name: /Konfirmasi Pesanan/i,
    });
    expect(confirmButton).toBeDisabled();

    await user.selectOptions(
      screen.getByLabelText(/Metode Pembayaran/i),
      "PAY_AT_STORE"
    );
    expect(confirmButton).toBeEnabled();

    await user.type(
      screen.getByPlaceholderText(/Contoh: Tolong siapkan/i),
      "Tolong sambalnya yang banyak."
    );
    await user.click(confirmButton);

    await waitFor(() => {
      expect(createOrder).toHaveBeenCalledWith({
        paymentMethod: "PAY_AT_STORE",
        notes: "Tolong sambalnya yang banyak.",
      });
    });

    await waitFor(
      () => {
        expect(mockClearCart).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith("/pesanan/mock-order-id");
      },
      { timeout: 3500 }
    );
  });

  test("tombol Konfirmasi Pesanan harus nonaktif jika metode pembayaran tidak dipilih", () => {
    renderCartPage();

    const confirmButton = screen.getByRole("button", {
      name: /Konfirmasi Pesanan/i,
    });

    expect(confirmButton).toBeDisabled();

    const alert = screen.queryByRole("alert");
    expect(alert).not.toBeInTheDocument();
  });

  test("menampilkan pesan error jika API gagal membuat pesanan", async () => {
    const originalError = console.error;
    console.error = jest.fn();

    const user = userEvent.setup();
    const apiErrorMessage = "Terjadi masalah pada server, coba lagi nanti.";
    createOrder.mockRejectedValue(new Error(apiErrorMessage));

    const { mockClearCart } = renderCartPage();

    await user.selectOptions(
      screen.getByLabelText(/Metode Pembayaran/i),
      "ONLINE_PAYMENT"
    );

    const confirmButton = screen.getByRole("button", {
      name: /Konfirmasi Pesanan/i,
    });
    await user.click(confirmButton);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(apiErrorMessage);

    expect(mockClearCart).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    console.error = originalError;
  });
});
