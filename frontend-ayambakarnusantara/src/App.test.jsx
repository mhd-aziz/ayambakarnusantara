import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";

vi.mock("./context/AuthContext", async () => ({
  __esModule: true,
  ...(await vi.importActual("./context/AuthContext")),
  useAuth: vi.fn(),
}));

vi.mock("./context/CartContext", async () => ({
  __esModule: true,
  ...(await vi.importActual("./context/CartContext")),
  useCart: vi.fn(),
}));

vi.mock("./services/ProfileService", async () => ({
  registerFCMToken: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("./firebase-config", async () => ({
  getFCMToken: vi.fn().mockResolvedValue("mock-fcm-token"),
}));

vi.mock("./pages/HomePage", async () => ({ default: () => <div>HomePage</div> }));
vi.mock("./pages/MenuPage", async () => ({ default: () => <div>MenuPage</div> }));
vi.mock("./pages/DetailMenuPage", async () => ({ default: () => <div>DetailMenuPage</div> }));
vi.mock("./pages/ShopPage", async () => ({ default: () => <div>ShopPage</div> }));
vi.mock("./pages/ShopDetailPage", async () => ({ default: () => <div>ShopDetailPage</div> }));
vi.mock("./pages/OrderPage", async () => ({ default: () => <div>OrderPage</div> }));
vi.mock("./pages/OrderDetailPage", async () => ({ default: () => <div>OrderDetailPage</div> }));
vi.mock("./pages/ProfilePage", async () => ({ default: () => <div>ProfilePage</div> }));
vi.mock("./pages/Seller/SellerPage", async () => ({ default: () => <div>SellerPage</div> }));
vi.mock("./pages/CartPage", async () => ({ default: () => <div>CartPage</div> }));
vi.mock("./pages/NotFoundPage", async () => ({ default: () => <div>NotFoundPage</div> }));
vi.mock("./pages/NotificationPage", async () => ({ default: () => <div>NotificationPage</div> }));

vi.mock("./components/Auth/LoginForm", async () => ({ default: () => <div>LoginForm</div> }));
vi.mock("./components/Auth/RegisterForm", async () => ({ default: () => (
  <div>RegisterForm</div>
) }));
vi.mock("./components/Auth/ForgotPasswordForm", async () => ({ default: () => (
  <div>ForgotPasswordForm</div>
) }));
vi.mock("./components/Layout/NavigationBar", async () => ({ default: () => (
  <div>NavigationBar</div>
) }));
vi.mock("./components/Layout/Footer", async () => ({ default: () => <div>Footer</div> }));
vi.mock("./components/Chat/GlobalChat", async () => ({ default: () => <div>GlobalChat</div> }));

const mockUser = {
  uid: "12345",
  displayName: "Test User",
  email: "test@example.com",
};

const renderWithRouter = (
  ui,
  {
    route = "/",
    authValue = { isLoggedIn: false, user: null, isLoading: false },
    cartValue = { cartItemCount: 0 },
  } = {}
) => {
  useAuth.mockReturnValue(authValue);
  useCart.mockReturnValue(cartValue);

  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
};

describe("Test Routing dan Komponen App", () => {
  beforeAll(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterAll(() => {
    console.warn.mockRestore();
  });

  beforeEach(() => {
    useAuth.mockClear();
    useCart.mockClear();
  });

  it("merender HomePage untuk path root (/) saat tidak login", () => {
    renderWithRouter(<App />);
    expect(screen.getByText("HomePage")).toBeInTheDocument();
  });

  it("merender MenuPage untuk path /menu", () => {
    renderWithRouter(<App />, { route: "/menu" });
    expect(screen.getByText("MenuPage")).toBeInTheDocument();
  });

  it("merender NotFoundPage untuk path yang tidak dikenal", () => {
    renderWithRouter(<App />, { route: "/halaman-yang-salah" });
    expect(screen.getByText("NotFoundPage")).toBeInTheDocument();
  });

  it("mengarahkan ke halaman login saat mengakses halaman terproteksi tanpa login", () => {
    renderWithRouter(<App />, { route: "/profile" });
    expect(screen.getByText("LoginForm")).toBeInTheDocument();
  });

  it("merender halaman terproteksi (ProfilePage) saat sudah login", () => {
    renderWithRouter(<App />, {
      route: "/profile",
      authValue: { isLoggedIn: true, user: mockUser, isLoading: false },
    });
    expect(screen.getByText("ProfilePage")).toBeInTheDocument();
  });

  it("menampilkan modal login saat navigasi ke /login", () => {
    renderWithRouter(<App />, { route: "/login" });
    expect(screen.getByText("LoginForm")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("menampilkan modal register saat navigasi ke /register", () => {
    renderWithRouter(<App />, { route: "/register" });
    expect(screen.getByText("RegisterForm")).toBeInTheDocument();
    expect(screen.getByText("Register")).toBeInTheDocument();
  });

  it("menampilkan tombol chat saat sudah login", () => {
    renderWithRouter(<App />, {
      authValue: { isLoggedIn: true, user: mockUser, isLoading: false },
    });
    expect(screen.getByTitle(/Buka Chat/i)).toBeInTheDocument();
  });

  it("tidak menampilkan tombol chat saat belum login", () => {
    renderWithRouter(<App />);
    expect(screen.queryByTitle(/Buka Chat/i)).not.toBeInTheDocument();
  });
});