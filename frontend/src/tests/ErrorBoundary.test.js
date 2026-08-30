import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "../utils/ErrorBoundary.js";

const Bomb = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error("boom from Bomb");
  return <div>aman</div>;
};

describe("ErrorBoundary (utils)", () => {
  let consoleSpy;
  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => consoleSpy.mockRestore());

  it("merender children saat tidak ada error", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("aman")).toBeInTheDocument();
  });

  it("menampilkan fallback UI saat child throw", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    expect(screen.getByText("Terjadi kesalahan")).toBeInTheDocument();
    expect(screen.getByText(/Muat Ulang/)).toBeInTheDocument();
    expect(screen.getByText("Ke Beranda")).toBeInTheDocument();
  });

  it("tombol Muat Ulang memanggil window.location.reload", () => {
    const reloadMock = vi.fn();
    const originalReload = window.location.reload;
    // jsdom: definisikan ulang reload
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: reloadMock },
      writable: true,
    });
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByText("Muat Ulang"));
    expect(reloadMock).toHaveBeenCalled();
    Object.defineProperty(window, "location", {
      value: { ...window.location, reload: originalReload },
      writable: true,
    });
  });
});
