import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import CartPage from "../pages/CartPage";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/OrderService";

vi.mock("../context/AuthContext");
vi.mock("../context/CartContext");
vi.mock("../services/OrderService");

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal()),
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
    fetchCart: vi.fn(),
    clearCartContext: mockClearCart,
    updateItemQuantity: vi.fn(),
    removeItem: vi.fn(),
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
    console.warn = vi.fn();
  });

  afterAll(() => {
    console.warn = originalWarn;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("berhasil membuat pesanan dan mengarahkan pengguna saat checkout valid", async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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

    // Redirect memakai setTimeout(3000) di CartPage — flush timer secara deterministik.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(mockClearCart).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/pesanan/mock-order-id");
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
    console.error = vi.fn();

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
