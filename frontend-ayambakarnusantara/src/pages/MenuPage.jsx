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
  Badge,
} from "../components/ui";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { getProducts } from "../services/MenuService";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { CheckCircleFill } from "react-bootstrap-icons";
import { FALLBACK_PRODUCT_IMAGE, handleProductImageError as handleImageError } from "../utils/imageFallback";

function MenuPage() {
  const [productsData, setProductsData] = useState({
    products: [],
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
  });
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [addToCartSuccessMessage, setAddToCartSuccessMessage] = useState("");
  const { isLoggedIn } = useAuth();
  const { addItem: addItemToCartContext, isLoading: isCartLoading } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [filterParams, setFilterParams] = useState(() => {
    const queryParams = new URLSearchParams(location.search);
    return {
      page: 1,
      limit: 10,
      category: "",
      sortBy: "createdAt",
      order: "desc",
      searchByName: queryParams.get("q") || "",
    };
  });

  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setError(null);
    try {
      const paramsToSend = { ...filterParams };
      if (!paramsToSend.searchByName) {
        delete paramsToSend.searchByName;
      }

      const response = await getProducts(paramsToSend);
      if (response && response.data) {
        setProductsData({
          products: response.data.products || [],
          currentPage: response.data.currentPage || 1,
          totalPages: response.data.totalPages || 1,
          totalProducts: response.data.totalProducts || 0,
        });
      } else {
        setProductsData({
          products: [],
          currentPage: 1,
          totalPages: 1,
          totalProducts: 0,
        });
        console.warn(
          "Respons API tidak memiliki struktur data yang diharapkan:",
          response
        );
      }
    } catch (err) {
      setError(
        err.message || "Gagal mengambil data produk. Silakan coba lagi nanti."
      );
      console.error("Error fetching products:", err);
      setProductsData({
        products: [],
        currentPage: 1,
        totalPages: 1,
        totalProducts: 0,
      });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [filterParams]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const searchQuery = queryParams.get("q") || "";
    if (searchQuery !== filterParams.searchByName) {
      setFilterParams((prevParams) => ({
        ...prevParams,
        searchByName: searchQuery,
        page: 1,
      }));
    }
  }, [location.search, filterParams.searchByName]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handlePageChange = (pageNumber) => {
    setFilterParams((prevParams) => ({ ...prevParams, page: pageNumber }));
    window.scrollTo(0, 0);
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilterParams((prevParams) => ({
      ...prevParams,
      [name]: value,
      page: 1,
    }));
  };

  const handleSortChange = (event) => {
    const { value } = event.target;
    const [sortBy, order] = value.split("_");
    setFilterParams((prevParams) => ({
      ...prevParams,
      sortBy,
      order,
      page: 1,
    }));
  };


  const handleAddToCart = async (product) => {
    if (!isLoggedIn) {
      alert(
        "Anda harus login terlebih dahulu untuk menambahkan item ke keranjang."
      );
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (product.stock === 0) {
      alert("Maaf, stok produk ini habis.");
      return;
    }

    try {
      const itemData = {
        productId: product._id,
        quantity: 1,
      };
      const response = await addItemToCartContext(itemData);

      if (response.status === "success" || response.success === true) {
        setAddToCartSuccessMessage(
          response.message || `${product.name} berhasil ditambahkan!`
        );
        setTimeout(() => {
          setAddToCartSuccessMessage("");
        }, 3000);
      }
    } catch (err) {
      setError(
        err.message || "Terjadi kesalahan saat menambahkan ke keranjang."
      );
      console.error("Error adding to cart from MenuPage:", err);
    }
  };

  let paginationItems = [];
  if (productsData.totalPages > 1) {
    const maxPagesToShow = 5;
    let startPage = Math.max(
      1,
      productsData.currentPage - Math.floor(maxPagesToShow / 2)
    );
    let endPage = Math.min(
      productsData.totalPages,
      startPage + maxPagesToShow - 1
    );
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    if (startPage > 1) {
      paginationItems.push(
        <Pagination.First
          key="first"
          onClick={() => handlePageChange(1)}
          disabled={productsData.currentPage === 1}
        />
      );
      paginationItems.push(
        <Pagination.Prev
          key="prev"
          onClick={() => handlePageChange(productsData.currentPage - 1)}
          disabled={productsData.currentPage === 1}
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
          active={number === productsData.currentPage}
          onClick={() => handlePageChange(number)}
        >
          {number}
        </Pagination.Item>
      );
    }
    if (endPage < productsData.totalPages) {
      if (endPage < productsData.totalPages - 1) {
        paginationItems.push(
          <Pagination.Ellipsis key="ellipsis-end" disabled />
        );
      }
      paginationItems.push(
        <Pagination.Next
          key="next"
          onClick={() => handlePageChange(productsData.currentPage + 1)}
          disabled={productsData.currentPage === productsData.totalPages}
        />
      );
      paginationItems.push(
        <Pagination.Last
          key="last"
          onClick={() => handlePageChange(productsData.totalPages)}
          disabled={productsData.currentPage === productsData.totalPages}
        />
      );
    }
  }

  return (
    <Container fluid className="py-4 md:px-4 menu-page-container-fluid">
      <Container>
        {addToCartSuccessMessage && (
          <Alert
            variant="success"
            onClose={() => setAddToCartSuccessMessage("")}
            dismissible
            className="fixed top-0 left-1/2 -translate-x-1/2 mt-3 z-index-toast"
            style={{ zIndex: 1055 }}
          >
            <CheckCircleFill className="me-2" />
            {addToCartSuccessMessage}
          </Alert>
        )}
        <div className="filters-section-wrapper">
          <Row className="items-center">
            <Col md={12} lg={5} className="mb-3 lg:mb-0">
              <h1 className="h2 mb-1" style={{ color: "#c0392b" }}>
                Menu Ayam Bakar Nusantara
              </h1>
              <p className="text-muted mb-0">
                Temukan pilihan ayam bakar dan hidangan pelengkap favorit Anda.
              </p>
            </Col>
            <Col md={12} lg={7}>
              <Row className="gap-2">
                <Col xs={12} sm={6}>
                  <Form.Group controlId="categoryFilter" className="w-full">
                    <Form.Label className="text-sm sr-only">
                      Filter Kategori:
                    </Form.Label>
                    <Form.Select
                      name="category"
                      value={filterParams.category}
                      onChange={handleFilterChange}
                      aria-label="Filter berdasarkan kategori"
                      className="form-select-sm"
                    >
                      <option value="">Semua Kategori</option>
                      <option value="Makanan">Makanan</option>
                      <option value="Minuman">Minuman</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6}>
                  <Form.Group controlId="sortFilter" className="w-full">
                    <Form.Label className="text-sm sr-only">
                      Urutkan:
                    </Form.Label>
                    <Form.Select
                      name="sort"
                      value={`${filterParams.sortBy}_${filterParams.order}`}
                      onChange={handleSortChange}
                      aria-label="Urutkan produk"
                      className="form-select-sm"
                    >
                      <option value="createdAt_desc">Terbaru</option>
                      <option value="createdAt_asc">Terlama</option>
                      <option value="price_asc">Harga: Terendah</option>
                      <option value="price_desc">Harga: Tertinggi</option>
                      <option value="name_asc">Nama: A-Z</option>
                      <option value="name_desc">Nama: Z-A</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Col>
          </Row>
        </div>

        {isLoadingProducts && (
          <div className="text-center py-5 loading-spinner-container">
            <Spinner
              animation="border"
              style={{ width: "3.5rem", height: "3.5rem", color: "#c0392b" }}
            />
            <p className="mt-3 text-lg" style={{ color: "#c0392b" }}>
              Memuat menu pilihan Anda...
            </p>
          </div>
        )}

        {error && (
          <Alert variant="danger" className="text-center text-lg py-4 shadow-sm">
            <Alert.Heading as="h3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>Oops!
              Terjadi Kesalahan
            </Alert.Heading>
            <p>{error}</p>
            <Button
              variant="outline-danger"
              onClick={fetchProducts}
              className="font-semibold"
            >
              <i className="bi bi-arrow-clockwise me-2"></i>Coba Lagi
            </Button>
          </Alert>
        )}

        {!isLoadingProducts && !error && productsData.products.length === 0 && (
          <Alert
            variant="light"
            className="text-center text-lg py-5 shadow-sm border"
          >
            <Alert.Heading as="h3" className="text-muted">
              <i className="bi bi-egg-fried me-2 text-4xl"></i>
            </Alert.Heading>
            <p className="text-muted mb-0">
              Maaf, menu yang Anda cari belum tersedia.
            </p>
            <p className="text-muted">
              Silakan coba filter lain atau kembali lagi nanti.
            </p>
          </Alert>
        )}

        {!isLoadingProducts && !error && productsData.products.length > 0 && (
          <>
            <Row xs={1} sm={2} md={3} lg={4} className="gap-6">
              {productsData.products.map((product) => (
                <Col key={product._id} className="flex items-stretch">
                  <Card className="w-full product-card">
                    <Card.Img
                      variant="top"
                      src={product.productImageURL || FALLBACK_PRODUCT_IMAGE}
                      onError={handleImageError}
                      alt={product.name}
                    />
                    <Card.Body className="flex flex-col p-3">
                      <div className="mb-2">
                        <Badge
                          pill
                          bg="light"
                          text="dark"
                          className="me-2 badge-category"
                        >
                          {product.category}
                        </Badge>
                        {product.stock === 0 && (
                          <Badge pill bg="danger" className="font-normal">
                            Habis
                          </Badge>
                        )}
                        {product.stock > 0 && product.stock <= 10 && (
                          <Badge
                            pill
                            bg="warning"
                            text="dark"
                            className="font-normal"
                          >
                            Stok Terbatas
                          </Badge>
                        )}
                      </div>
                      <Card.Title as="h3" className="h6 mb-1">
                        {product.name}
                      </Card.Title>
                      {product.description && (
                        <Card.Text className="description-text mb-2 grow-0">
                          {product.description}
                        </Card.Text>
                      )}
                      <div className="mt-auto pt-2">
                        <p className="price mb-2">
                          Rp {product.price.toLocaleString("id-ID")}
                        </p>
                        <div className="button-group">
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            className="btn-detail"
                            as={Link}
                            to={`/menu/${product._id}`}
                          >
                            <i className="bi bi-eye-fill me-1"></i>Detail
                          </Button>
                          <Button
                            variant={
                              product.stock > 0 ? "primary" : "secondary"
                            }
                            size="sm"
                            className="btn-add-to-cart"
                            disabled={product.stock === 0 || isCartLoading}
                            onClick={() => handleAddToCart(product)}
                          >
                            {isCartLoading ? (
                              <Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                              />
                            ) : (
                              <>
                                <i
                                  className={`bi ${ product.stock > 0 ? "bi-cart-plus-fill" : "bi-slash-circle" } me-1`}
                                ></i>
                                {product.stock > 0 ? "Keranjang" : "Habis"}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>

            {productsData.totalPages > 1 && (
              <div className="flex justify-center mt-5">
                {/* PERUBAHAN: Menambahkan className */}
                <Pagination className="menu-pagination">
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

export default MenuPage;