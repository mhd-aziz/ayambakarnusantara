import React from "react";
import { Container, Row, Col, Alert } from "react-bootstrap";
import { InfoCircleFill, ShopWindow } from "react-bootstrap-icons";
import CreateSellerForm from "./CreateSellerForm";

/**
 * Empty state konsisten untuk user yang belum memiliki toko.
 * Dipakai di 4 halaman seller: Dashboard, Info Toko, Kelola Produk, Pesanan.
 * - UI konsisten: Container seller-page-content + Alert info + form terpusat
 * - Pesan konsisten (role-aware tapi struktur sama)
 * - Tidak mengubah alur bisnis: onShopCreated tetap memicu handleShopCreated + loadInitialData
 */
function SellerEmptyState({
  userRole,
  handleShopCreated,
  loadInitialData,
}) {
  const isCustomer = userRole === "customer";

  const handleCreated = async (newShopData) => {
    if (handleShopCreated) {
      await handleShopCreated(newShopData);
    }
    if (loadInitialData) {
      await loadInitialData();
    }
  };

  return (
    <Container className="seller-page-content">
      <div className="text-center mb-3">
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{
            width: 56,
            height: 56,
            background: "rgba(192,119,34,0.12)",
            color: "#C07722",
          }}
        >
          <ShopWindow size={28} />
        </div>
        <h4 className="mb-1">Belum Memiliki Toko</h4>
        <p className="text-muted mb-0">
          Anda belum memiliki toko. Buat toko Anda sekarang untuk mengakses
          fitur seller.
        </p>
      </div>

      <Alert
        variant={isCustomer ? "info" : "warning"}
        className="mb-4 text-center shadow-sm"
      >
        <InfoCircleFill size={18} className="me-2" />
        {isCustomer ? (
          <>
            Anda saat ini sebagai pelanggan. Lengkapi form di bawah untuk
            membuka toko dan mulai berjualan di Ayam Bakar Nusantara.
          </>
        ) : (
          <>
            Anda terdaftar sebagai penjual namun data toko belum tersedia.
            Silakan buat toko Anda sekarang.
          </>
        )}
      </Alert>

      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <div className="seller-form">
            <CreateSellerForm onShopCreated={handleCreated} />
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default SellerEmptyState;
