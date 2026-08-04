import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Alert,
  Button,
  Pagination,
  Form,
  InputGroup,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { getAllShops } from "../services/ShopService";
import "../css/ShopPage.css";
import { handleShopImageError } from "../utils/imageFallback";
import {
  ExclamationTriangleFill,
  Shop,
  ArrowClockwise,
  GeoAltFill,
  Search,
} from "react-bootstrap-icons";

function ShopPage() {
  const [shops, setShops] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchShops = useCallback(async (page = 1, search = "") => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page };
      if (search) {
        params.searchByShopName = search;
      }
      const response = await getAllShops(params);
      if (
        response &&
        response.success &&
        response.data &&
        Array.isArray(response.data.shops)
      ) {
        setShops(response.data.shops);
        setCurrentPage(response.data.currentPage);
        setTotalPages(response.data.totalPages);
      } else {
        setShops([]);
        setTotalPages(1);
        setError(
          response?.message ||
            "Gagal mengambil data toko (format respons tidak sesuai)."
        );
      }
    } catch (err) {
      setError(
        err.message ||
          "Terjadi kesalahan pada server saat mengambil daftar toko."
      );
      setShops([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchShops(currentPage, searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, currentPage, fetchShops]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };


  let paginationItems = [];
  if (totalPages > 1) {
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      paginationItems.push(
        <Pagination.First
          key="first"
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
        />
      );
      paginationItems.push(
        <Pagination.Prev
          key="prev"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        />
      );
      if (startPage > 2) {
        paginationItems.push(
          <Pagination.Ellipsis key="ellipsis-start" disabled />
        );
      }
    }

    for (let number = startPage; number <= endPage; number++) {
      paginationItems.push(
        <Pagination.Item
          key={number}
          active={number === currentPage}
          onClick={() => handlePageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationItems.push(
          <Pagination.Ellipsis key="ellipsis-end" disabled />
        );
      }
      paginationItems.push(
        <Pagination.Next
          key="next"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        />
      );
      paginationItems.push(
        <Pagination.Last
          key="last"
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
        />
      );
    }
  }

  return (
    <Container fluid className="py-4 px-md-4 shop-page-container-fluid">
      <Container>
        <div className="page-header-wrapper mb-4 mb-md-5">
          <Row className="align-items-center justify-content-between">
            <Col xs={12} md="auto" className="mb-3 mb-md-0">
              <h1 className="h2 mb-1" style={{ color: "var(--brand-primary)" }}>
                Temukan Toko Ayam Bakar Nusantara
              </h1>
              <p className="text-muted mb-0">
                Jelajahi berbagai pilihan toko Ayam Bakar Nusantara di dekat
                Anda.
              </p>
            </Col>
            <Col xs={12} md={5} lg={4}>
              <Form onSubmit={(e) => e.preventDefault()}>
                <InputGroup>
                  <Form.Control
                    type="search"
                    placeholder="Cari nama toko..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    aria-label="Cari Toko"
                  />
                  <Button variant="outline-secondary" disabled>
                    <Search />
                  </Button>
                </InputGroup>
              </Form>
            </Col>
          </Row>
        </div>

        {isLoading && (
          <div className="text-center py-5 loading-spinner-container">
            <Spinner
              animation="border"
              style={{
                width: "3.5rem",
                height: "3.5rem",
                color: "var(--brand-primary)",
              }}
            />
            <p className="mt-3 lead" style={{ color: "var(--brand-primary)" }}>
              Memuat daftar toko...
            </p>
          </div>
        )}

        {error && !isLoading && (
          <Alert variant="danger" className="text-center lead py-4 shadow-sm">
            <Alert.Heading as="h3">
              <ExclamationTriangleFill className="me-2" />
              Oops! Terjadi Kesalahan
            </Alert.Heading>
            <p>{error}</p>
            <Button
              variant="outline-danger"
              onClick={() => fetchShops(1)}
              className="fw-semibold"
            >
              <ArrowClockwise className="me-2" />
              Coba Lagi
            </Button>
          </Alert>
        )}

        {!isLoading && !error && shops.length === 0 && (
          <Alert
            variant="light"
            className="text-center lead py-5 shadow-sm border"
          >
            <Alert.Heading as="h3" className="text-muted">
              <Shop className="me-2 fs-1" />
            </Alert.Heading>
            <p className="text-muted mb-0">
              {searchTerm
                ? "Toko yang Anda cari tidak ditemukan."
                : "Maaf, belum ada toko yang terdaftar."}
            </p>
            {searchTerm && (
              <p className="text-muted">
                Coba gunakan kata kunci lain atau lihat semua toko.
              </p>
            )}
          </Alert>
        )}

        {!isLoading && !error && shops.length > 0 && (
          <>
            <Row xs={1} sm={2} md={3} lg={4} className="g-4">
              {shops.map((shop) => {
                return (
                  <Col key={shop.shopId} className="d-flex align-items-stretch">
                    <Card className="w-100 shop-card">
                      <div className="shop-card-img-wrapper">
                        <Card.Img
                          variant="top"
                          src={
                            shop.bannerImageURL ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              shop.shopName || "Toko"
                            )}&size=400&background=efefef&color=757575&font-size=0.33&length=2`
                          }
                          alt={shop.shopName || "Toko"}
                          className="shop-card-img"
                          onError={(e) => handleShopImageError(e)}
                        />
                      </div>
                      <Card.Body className="d-flex flex-column p-3">
                        <Card.Title className="shop-card-title h5">
                          {shop.shopName}
                        </Card.Title>

                        <Card.Text className="shop-card-description mb-2 small text-muted">
                          {shop.description || "Tidak ada deskripsi."}
                        </Card.Text>

                        <Card.Text className="shop-card-address mb-2 small text-muted">
                          <GeoAltFill className="me-1" />
                          {shop.shopAddress || "Alamat tidak tersedia."}
                        </Card.Text>

                        <Card.Text className="shop-card-owner mb-2 small">
                          <small className="text-muted">
                            Pemilik: {shop.ownerName || "Tidak diketahui"}
                          </small>
                        </Card.Text>

                        <Button
                          as={Link}
                          to={`/toko/${shop.shopId}`}
                          variant="primary"
                          className="mt-auto btn-brand"
                        >
                          Lihat Toko & Menu
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-5">
                <Pagination className="shop-pagination">
                  {paginationItems}
                </Pagination>
              </div>
            )}
          </>
        )}
      </Container>
    </Container>
  );
}

export default ShopPage;
