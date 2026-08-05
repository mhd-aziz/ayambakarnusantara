// src/pages/NotFoundPage.js
import React from "react";
import { Container, Row, Col, Button, Image } from "../components/ui";
import { Link } from "react-router-dom";
import { HouseDoorFill, ArrowLeftCircleFill } from "react-bootstrap-icons";
const imageUrl = "/images/404-not-found.png";

function NotFoundPage() {
  return (
    <Container
      fluid
      className="flex items-center justify-center h-screen not-found-page-container text-center"
    >
      <Row className="justify-center">
        <Col md={8} lg={6}>
          <Image
            src={imageUrl}
            alt="Halaman Tidak Ditemukan"
            fluid
            className="not-found-image mb-4"
            onError={(e) => {
              // Fallback jika gambar utama tidak ditemukan
              e.target.onerror = null;
              e.target.style.display = "none"; // Sembunyikan jika gambar error
              // Atau tampilkan teks alternatif
              // e.target.parentElement.innerHTML += '<p class="h1">404</p>';
            }}
          />
          <h1 className="not-found-title">Oops! Halaman Hilang.</h1>
          <p className="not-found-subtitle text-muted">
            Maaf, halaman yang Anda cari tidak dapat ditemukan atau mungkin
            sudah dipindahkan.
          </p>
          <div className="mt-4">
            <Button
              as={Link}
              to="/"
              variant="primary"
              className="me-2 btn-brand"
            >
              <HouseDoorFill className="me-2" />
              Kembali ke Beranda
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => window.history.back()}
            >
              <ArrowLeftCircleFill className="me-2" />
              Kembali ke Halaman Sebelumnya
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default NotFoundPage;