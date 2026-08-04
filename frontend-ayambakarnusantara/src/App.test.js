import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";

jest.mock("./context/AuthContext", () => ({
  __esModule: true,
  ...jest.requireActual("./context/AuthContext"),
  useAuth: jest.fn(),
}));

jest.mock("./context/CartContext", () => ({
  __esModule: true,
  ...jest.requireActual("./context/CartContext"),
  useCart: jest.fn(),
}));

jest.mock("./services/ProfileService", () => ({
  registerFCMToken: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock("./firebase-config", () => ({
  getFCMToken: jest.fn().mockResolvedValue("mock-fcm-token"),
}));

jest.mock("./pages/HomePage", () => () => <div>HomePage</div>);
jest.mock("./pages/MenuPage", () => () => <div>MenuPage</div>);
jest.mock("./pages/DetailMenuPage", () => () => <div>DetailMenuPage</div>);
jest.mock("./pages/ShopPage", () => () => <div>ShopPage</div>);
jest.mock("./pages/ShopDetailPage", () => () => <div>ShopDetailPage</div>);
jest.mock("./pages/OrderPage", () => () => <div>OrderPage</div>);
jest.mock("./pages/OrderDetailPage", () => () => <div>OrderDetailPage</div>);
jest.mock("./pages/ProfilePage", () => () => <div>ProfilePage</div>);
jest.mock("./pages/Seller/SellerPage", () => () => <div>SellerPage</div>);
jest.mock("./pages/CartPage", () => () => <div>CartPage</div>);
jest.mock("./pages/NotFoundPage", () => () => <div>NotFoundPage</div>);
jest.mock("./pages/NotificationPage", () => () => <div>NotificationPage</div>);

jest.mock("./components/Auth/LoginForm", () => () => <div>LoginForm</div>);
jest.mock("./components/Auth/RegisterForm", () => () => (
  <div>RegisterForm</div>
));
jest.mock("./components/Auth/ForgotPasswordForm", () => () => (
  <div>ForgotPasswordForm</div>
));
jest.mock("./components/Layout/NavigationBar", () => () => (
  <div>NavigationBar</div>
));
jest.mock("./components/Layout/Footer", () => () => <div>Footer</div>);
jest.mock("./components/Chat/GlobalChat", () => () => <div>GlobalChat</div>);

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
    jest.spyOn(console, "warn").mockImplementation(() => {});
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
