// src/components/Layout/Footer.js
import React from "react";
import { Container, Row, Col, Nav } from "react-bootstrap";
import { Link } from "react-router-dom";
import logoImage from "../../assets/logo.jpg";
import "../../css/Footer.css";

function Footer({ onOpenChatbot }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="footer-container text-white pt-5 pb-4"
      data-bs-theme="dark"
    >
      <Container>
        <Row className="gy-4">
          <Col lg={4} md={6} className="text-center text-md-start">
            <Link
              to="/"
              className="footer-brand d-flex align-items-center justify-content-center justify-content-md-start mb-3"
            >
              <img
                src={logoImage}
                width="45"
                height="45"
                className="d-inline-block align-top me-2"
                alt="Ayam Bakar Nusantara Logo"
              />
              <span className="footer-brand-text">Ayam Bakar Nusantara</span>
            </Link>
            <p className="footer-description small">
              Nikmati kelezatan Ayam Bakar Nusantara dengan resep autentik
              turun-temurun. Kualitas terbaik, rasa tak terlupakan.
            </p>
          </Col>

          <Col lg={4} md={3} xs={6}>
            <h5 className="footer-heading">Navigasi</h5>
            <Nav className="flex-column footer-nav">
              <Nav.Link as={Link} to="/" className="footer-link">
                Beranda
              </Nav.Link>
              <Nav.Link as={Link} to="/menu" className="footer-link">
                Menu
              </Nav.Link>
              <Nav.Link as={Link} to="/toko" className="footer-link">
                Toko
              </Nav.Link>
            </Nav>
          </Col>

          <Col lg={4} md={3} xs={6}>
            <h5 className="footer-heading">Bantuan & Kebijakan</h5>
            <Nav className="flex-column footer-nav">
              <Nav.Link
                as="button"
                onClick={onOpenChatbot}
                className="footer-link-button"
              >
                Chatbot
              </Nav.Link>
              <Nav.Link as={Link} to="/#hubungi-kami" className="footer-link">
                Hubungi Kami
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/syarat-ketentuan"
                className="footer-link"
              >
                Syarat & Ketentuan
              </Nav.Link>
              <Nav.Link
                as={Link}
                to="/kebijakan-privasi"
                className="footer-link"
              >
                Kebijakan Privasi
              </Nav.Link>
            </Nav>
          </Col>
        </Row>
        <hr className="footer-hr" />
        <Row>
          <Col className="text-center">
            <p className="footer-copyright mb-0">
              © {currentYear} Ayam Bakar Nusantara. Semua Hak Dilindungi.
            </p>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}

export default Footer;
