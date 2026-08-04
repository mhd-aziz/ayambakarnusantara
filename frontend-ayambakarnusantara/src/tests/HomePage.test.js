import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "../pages/HomePage";
import { getProducts } from "../services/MenuService";
import { getAllRatings } from "../services/RatingService";

jest.mock("../services/MenuService");
jest.mock("../services/RatingService");
jest.mock("../services/FeedbackService");

const mockProducts = [
  {
    _id: "1",
    name: "Ayam Bakar Madu",
    price: 25000,
    category: "Makanan",
    averageRating: 4.5,
    ratingCount: 10,
    productImageURL: "url/1",
  },
  {
    _id: "2",
    name: "Es Teh Manis",
    price: 5000,
    category: "Minuman",
    averageRating: 4.8,
    ratingCount: 20,
    productImageURL: "url/2",
  },
];

const mockRatings = [
  {
    ratingId: "r1",
    userDisplayName: "Budi",
    ratingValue: 5,
    reviewText: "Ulasan yang sangat baik.",
  },
];

describe("Halaman HomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
    console.warn.mockRestore();
  });

  test("menampilkan judul utama dan tombol CTA", () => {
    getProducts.mockResolvedValue({ success: true, data: { products: [] } });
    getAllRatings.mockResolvedValue({ success: true, data: { ratings: [] } });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText("AYAM BAKAR NUSANTARA")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Pesan Sekarang!/i })
    ).toBeInTheDocument();
  });

  test("menampilkan produk dan ulasan setelah data berhasil dimuat", async () => {
    getProducts.mockResolvedValue({
      success: true,
      data: { products: mockProducts },
    });
    getAllRatings.mockResolvedValue({
      success: true,
      data: { ratings: mockRatings },
    });

    await act(async () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );
    });

    const ayamMaduElements = await screen.findAllByText("Ayam Bakar Madu");
    const esTehElements = await screen.findAllByText("Es Teh Manis");

    expect(ayamMaduElements.length).toBeGreaterThan(0);
    expect(esTehElements.length).toBeGreaterThan(0);

    expect(
      await screen.findByText(/ulasan yang sangat baik/i)
    ).toBeInTheDocument();
  });

  test("tidak menampilkan produk jika API gagal", async () => {
    getProducts.mockRejectedValue(new Error("Network Error"));
    getAllRatings.mockResolvedValue({ success: true, data: { ratings: [] } });

    await act(async () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Ayam Bakar Madu")).not.toBeInTheDocument();
    });
  });
});
