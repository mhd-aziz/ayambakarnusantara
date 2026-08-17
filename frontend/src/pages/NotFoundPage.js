// src/pages/NotFoundPage.js
import React from "react";
import { Container, Row, Col, Button, Image } from "react-bootstrap";
import { Link } from "react-router-dom";
import { HouseDoorFill, ArrowLeftCircleFill } from "react-bootstrap-icons";
import "../css/NotFoundPage.css";
const imageUrl = "/images/404-not-found.png";

function NotFoundPage() {
  return (
    <Container
      fluid
      className="d-flex align-items-center justify-content-center vh-100 not-found-page-container text-center"
    >
      <Row className="justify-content-center">
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
