import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Image,
  Spinner,
  Alert,
  Button,
  Card,
  Breadcrumb,
  Badge,
  Form,
  InputGroup,
  Nav,
} from "react-bootstrap";
import { getProductById, getProducts } from "../services/MenuService";
import { getShopDetailById } from "../services/ShopService";
import {
  getProductRatings,
  updateRating,
  deleteRating,
} from "../services/RatingService";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import StarRatingDisplay from "../components/Menu/StarRatingDisplay";
import ProductRatings from "../components/Menu/ProductRatings";
import RatingModal from "../components/Menu/RatingModal";
import DeleteRatingModal from "../components/Menu/DeleteRatingModal";

import {
  CheckCircleFill,
  ExclamationTriangleFill,
  Search,
  ArrowLeftCircleFill,
  DashLg,
  PlusLg,
  CartPlusFill,
  XCircleFill,
  ArrowLeft,
  Shop,
} from "react-bootstrap-icons";
import "../css/DetailMenuPage.css";
import { handleProductImageError, handleProductSmallImageError as handleImageError } from "../utils/imageFallback";
import "../css/ShopDetailPage.css";
import "../css/ShopPage.css";

const RelatedProducts = ({ products, isLoading, error }) => {
  const handleProductImageError = (e, productName) => {
    e.target.onerror = null;
    const nameForAvatar = productName || "Produk";
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      nameForAvatar
    )}&size=300&background=efefef&color=757575&font-size=0.33&length=2`;
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" size="sm" />
      </div>
    );
  }
  if (error) {
    return (
      <Alert variant="info" className="text-center">
        Tidak dapat memuat produk terkait saat ini.
      </Alert>
    );
  }
  if (!products || products.length === 0) {
    return (
      <p className="text-muted text-center py-5">
        Tidak ada produk lain dari toko ini.
      </p>
    );
  }

  return (
    <Row xs={1} sm={2} md={2} lg={4} className="g-4">
      {products.map((product) => (
        <Col key={product._id} className="d-flex align-items-stretch">
          <Card className="w-100 h-100 product-list-card shop-card shadow-sm">
            <div className="shop-card-img-wrapper">
              <Card.Img
                variant="top"
                className="shop-card-img"
                src={
                  product.productImageURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    product.name || "Produk"
                  )}&size=300&background=efefef&color=757575&font-size=0.33&length=2`
                }
                onError={(e) => handleProductImageError(e, product.name)}
                alt={product.name}
              />
            </div>
            <Card.Body className="d-flex flex-column p-3">
              {product.category && (
                <Badge
                  pill
                  bg="light"
                  text="dark"
                  className="mb-2 product-category-badge align-self-start shadow-sm"
                >
                  {product.category}
                </Badge>
              )}
              <Card.Title
                as="h5"
                className="product-list-card-title shop-card-title flex-grow-1"
              >
                {product.name}
              </Card.Title>
              <div className="mt-auto">
                <p
                  className="product-list-card-price h5 mb-2"
                  style={{ color: "var(--brand-primary)" }}
                >
                  Rp {product.price.toLocaleString("id-ID")}
                </p>
                <Button
                  variant="primary"
                  className="btn-brand w-100 mt-1"
                  as={Link}
                  to={`/menu/${product._id}`}
                >
                  Lihat Detail
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

function DetailMenuPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, isLoggedIn } = useAuth();
  const { addItem: addItemToCartContext, isLoading: isCartLoading } = useCart();

  const [menuItem, setMenuItem] = useState(null);
  const [shopInfo, setShopInfo] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addToCartSuccessMessage, setAddToCartSuccessMessage] = useState("");
  const [isProcessingCartAction, setIsProcessingCartAction] = useState(false);

  const [ratingsData, setRatingsData] = useState(null);
  const [isLoadingRatings, setIsLoadingRatings] = useState(true);
  const [errorRatings, setErrorRatings] = useState(null);

  const [relatedProducts, setRelatedProducts] = useState([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState(true);
  const [errorRelated, setErrorRelated] = useState(null);

  const [showEditRatingModal, setShowEditRatingModal] = useState(false);
  const [ratingToEdit, setRatingToEdit] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [ratingToDeleteId, setRatingToDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState("reviews");
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 75) {
      if (activeTab === "reviews") setActiveTab("related");
    }
    if (touchStartX.current - touchEndX.current < -75) {
      if (activeTab === "related") setActiveTab("reviews");
    }
  };

  const fetchPageData = useCallback(async () => {
    if (!productId) {
      setError("ID Produk tidak ditemukan di URL.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsLoadingRatings(true);
    setErrorRatings(null);
    setIsLoadingRelated(true);
    setErrorRelated(null);

    try {
      const productResponse = await getProductById(productId);
      let fetchedProduct;
      if (productResponse && productResponse.data) {
        fetchedProduct = productResponse.data;
      } else {
        const productError = new Error(
          productResponse?.message || "Produk tidak ditemukan."
        );
        throw productError;
      }

      const [ratingsResponse, relatedProductsResponse, shopResponse] =
        await Promise.all([
          getProductRatings(productId),
          getProducts({ limit: 5, shopId: fetchedProduct.shopId }),
          getShopDetailById(fetchedProduct.shopId),
        ]);

      if (ratingsResponse && ratingsResponse.success) {
        setRatingsData(ratingsResponse.data);
        if (ratingsResponse.data.productDetails) {
          fetchedProduct = {
            ...fetchedProduct,
            ...ratingsResponse.data.productDetails,
          };
        }
      } else {
        setErrorRatings(
          ratingsResponse?.message || "Gagal mengambil data rating."
        );
      }

      if (shopResponse && shopResponse.success && shopResponse.data) {
        setShopInfo(shopResponse.data.shop);
      } else {
        console.warn("Gagal memuat informasi toko:", shopResponse?.message);
      }

      setMenuItem(fetchedProduct);

      if (relatedProductsResponse && relatedProductsResponse.data) {
        const filteredProducts = relatedProductsResponse.data.products
          .filter((p) => p._id !== productId)
          .slice(0, 4);
        setRelatedProducts(filteredProducts);
      } else {
        setErrorRelated("Gagal mengambil produk terkait.");
      }
    } catch (err) {
      setError(err.message || "Gagal mengambil detail produk.");
    } finally {
      setIsLoading(false);
      setIsLoadingRatings(false);
      setIsLoadingRelated(false);
    }
  }, [productId]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPageData();
  }, [productId, fetchPageData]);

  const handleShowEditModal = (rating) => {
    setRatingToEdit(rating);
    setEditError("");
    setShowEditRatingModal(true);
  };
  const handleCloseEditModal = () => {
    setShowEditRatingModal(false);
    setRatingToEdit(null);
  };
  const handleUpdateRating = async (ratingValue, reviewText) => {
    if (!ratingToEdit) return;
    if (ratingValue === 0) {
      setEditError("Rating bintang wajib diisi.");
      return;
    }
    setIsSubmittingEdit(true);
    setEditError("");
    try {
      await updateRating(ratingToEdit.ratingId, { ratingValue, reviewText });
      handleCloseEditModal();
      fetchPageData();
    } catch (err) {
      setEditError(err.message || "Terjadi kesalahan saat memperbarui ulasan.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleShowDeleteModal = (id) => {
    setRatingToDeleteId(id);
    setShowDeleteConfirmModal(true);
  };
  const handleCloseDeleteModal = () => {
    setShowDeleteConfirmModal(false);
    setRatingToDeleteId(null);
  };
  const handleConfirmDelete = async () => {
    if (!ratingToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteRating(ratingToDeleteId);
      handleCloseDeleteModal();
      fetchPageData();
    } catch (err) {
      alert("Gagal menghapus ulasan: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuantityChange = (change) => {
    setQuantity((prevQuantity) => {
      const newQuantity = prevQuantity + change;
      if (newQuantity < 1) return 1;
      const currentProduct = menuItem;
      if (currentProduct && newQuantity > currentProduct.stock) {
        alert(
          `Stok produk tersisa ${currentProduct.stock}. Kuantitas diatur ke ${currentProduct.stock}.`
        );
        return currentProduct.stock;
      }
      return newQuantity;
    });
  };

  const handleAddToCartClick = async () => {
    const currentProduct = menuItem;
    if (!currentProduct || !productId) {
      alert("Detail produk tidak tersedia.");
      return;
    }
    if (!isLoggedIn) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    if (currentProduct.stock === 0) {
      alert("Maaf, stok produk ini habis.");
      return;
    }
    if (quantity > currentProduct.stock) {
      alert(
        `Maaf, stok produk tidak mencukupi. Tersisa ${currentProduct.stock} item.`
      );
      setQuantity(currentProduct.stock);
      return;
    }
    setIsProcessingCartAction(true);
    setError("");
    setAddToCartSuccessMessage("");
    try {
      const itemData = { productId, quantity };
      const response = await addItemToCartContext(itemData);
      if (response.status === "success" || response.success === true) {
        setAddToCartSuccessMessage(
          response.message ||
            `${currentProduct.name} berhasil ditambahkan ke keranjang!`
        );
        setTimeout(() => {
          setAddToCartSuccessMessage("");
        }, 3000);
      } else {
        setError(response.message || "Gagal menambahkan produk ke keranjang.");
      }
    } catch (err) {
      setError(
        err.message || "Terjadi kesalahan saat menambahkan ke keranjang."
      );
    } finally {
      setIsProcessingCartAction(false);
    }
  };


  if (isLoading) {
    return (
      <Container fluid className="py-5 detail-menu-page-container-fluid">
        <Container className="text-center loading-spinner-container">
          <Spinner
            animation="border"
            style={{
              width: "4rem",
              height: "4rem",
              color: "var(--brand-primary, #c0392b)",
            }}
          />
          <p
            className="mt-3 lead"
            style={{ color: "var(--brand-primary, #c0392b)" }}
          >
            Memuat detail produk...
          </p>
        </Container>
      </Container>
    );
  }

  if (error && !menuItem) {
    return (
      <Container fluid className="py-5 detail-menu-page-container-fluid">
        <Container>
          <Alert variant="danger" className="text-center lead py-4 shadow-sm">
            <Alert.Heading as="h3">
              <ExclamationTriangleFill className="me-2" /> Gagal Memuat Data
            </Alert.Heading>
            <p>{error}</p>
            <Button
              as={Link}
              to="/menu"
              variant="outline-primary"
              className="fw-semibold"
            >
              <ArrowLeftCircleFill className="me-2" /> Kembali ke Menu
            </Button>
          </Alert>
        </Container>
      </Container>
    );
  }

  if (!menuItem) {
    return (
      <Container fluid className="py-5 detail-menu-page-container-fluid">
        <Container>
          <Alert variant="warning" className="text-center lead py-4 shadow-sm">
            <Alert.Heading as="h3">
              <Search className="me-2" /> Produk Tidak Ditemukan
            </Alert.Heading>
            <p>Detail untuk produk ini tidak dapat ditemukan.</p>
            <Button
              as={Link}
              to="/menu"
              variant="outline-primary"
              className="fw-semibold"
            >
              <ArrowLeftCircleFill className="me-2" /> Kembali ke Menu
            </Button>
          </Alert>
        </Container>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4 px-lg-5 detail-menu-page-container-fluid">
      <Container>
        {addToCartSuccessMessage && (
          <Alert
            variant="success"
            onClose={() => setAddToCartSuccessMessage("")}
            dismissible
            className="position-fixed top-0 start-50 translate-middle-x mt-3 z-index-toast shadow-lg"
            style={{ zIndex: 1055 }}
          >
            <CheckCircleFill className="me-2" />
            {addToCartSuccessMessage}
          </Alert>
        )}
        <Breadcrumb className="breadcrumb-custom">
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
            Home
          </Breadcrumb.Item>
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/menu" }}>
            Menu
          </Breadcrumb.Item>
          <Breadcrumb.Item active>{menuItem.name}</Breadcrumb.Item>
        </Breadcrumb>
        <Card className="border-0 shadow-sm detail-menu-card-wrapper mb-4">
          <Card.Body>
            <Row className="detail-menu-card">
              <Col lg={6} md={5} className="mb-4 mb-md-0 detail-menu-image-col">
                <Image
                  src={
                    menuItem.productImageURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      menuItem.name || "Produk"
                    )}&background=EFEFEF&color=AAAAAA&size=600`
                  }
                  alt={menuItem.name}
                  className="detail-menu-image rounded"
                  onError={handleImageError}
                  fluid
                />
              </Col>
              <Col lg={6} md={7} className="detail-menu-info-col ps-md-4">
                <Badge
                  bg="light"
                  text="dark"
                  className="mb-2 px-2 py-1 category-badge shadow-sm"
                >
                  {menuItem.category}
                </Badge>
                <h1 className="h2 detail-menu-title mb-3">{menuItem.name}</h1>
                <div className="mb-3">
                  <StarRatingDisplay rating={menuItem.averageRating || 0} />
                  <span className="ms-2 text-muted">
                    ({menuItem.ratingCount || 0} ulasan)
                  </span>
                </div>
                <p className="detail-menu-description lead text-muted mb-3">
                  {menuItem.description || "Deskripsi produk tidak tersedia."}
                </p>
                {shopInfo && (
                  <div className="mb-3">
                    <span className="text-muted">
                      <Shop className="me-2" />
                      Toko{" "}
                    </span>
                    <Link
                      to={`/toko/${menuItem.shopId}`}
                      className="fw-bold link-dark text-decoration-none"
                    >
                      {shopInfo.shopName}
                    </Link>
                  </div>
                )}
                <div className="mb-3 detail-menu-stock-info">
                  {menuItem.stock > 0 ? (
                    <Badge
                      bg="success-light"
                      text="success"
                      pill
                      className="stock-badge px-3 py-2"
                    >
                      <CheckCircleFill className="me-1" /> Stok Tersedia:{" "}
                      {menuItem.stock}
                    </Badge>
                  ) : (
                    <Badge
                      bg="danger-light"
                      text="danger"
                      pill
                      className="stock-badge px-3 py-2"
                    >
                      <XCircleFill className="me-1" /> Stok Habis
                    </Badge>
                  )}
                </div>
                <div
                  className="detail-menu-price h3 mb-3 fw-bold"
                  style={{ color: "var(--brand-primary, #c0392b)" }}
                >
                  Rp {menuItem.price.toLocaleString("id-ID")}
                </div>
                {menuItem.stock > 0 && (
                  <>
                    <Row className="align-items-center mb-3 gx-2">
                      <Col xs="auto">
                        <Form.Label
                          htmlFor="quantity-input"
                          className="mb-0 small text-muted"
                        >
                          Jumlah:
                        </Form.Label>
                      </Col>
                      <Col xs="auto">
                        <InputGroup
                          className="quantity-selector shadow-sm"
                          size="sm"
                        >
                          <Button
                            variant="outline-secondary"
                            className="rounded-start"
                            onClick={() => handleQuantityChange(-1)}
                            disabled={quantity <= 1}
                          >
                            <DashLg />
                          </Button>
                          <Form.Control
                            id="quantity-input"
                            type="text"
                            value={quantity}
                            readOnly
                            className="text-center fw-bold border-start-0 border-end-0"
                            style={{
                              maxWidth: "50px",
                              backgroundColor: "#fff",
                            }}
                          />
                          <Button
                            variant="outline-secondary"
                            className="rounded-end"
                            onClick={() => handleQuantityChange(1)}
                            disabled={quantity >= menuItem.stock}
                          >
                            <PlusLg />
                          </Button>
                        </InputGroup>
                      </Col>
                    </Row>
                    <Row className="mt-4 actions-row gx-2">
                      <Col xs={12} sm={6} className="mb-2 mb-sm-0 d-grid">
                        <Button
                          variant="outline-secondary"
                          onClick={() => navigate(-1)}
                          className="btn-action shadow-sm"
                        >
                          <ArrowLeft className="me-1" /> Kembali
                        </Button>
                      </Col>
                      <Col xs={12} sm={6} className="d-grid">
                        <Button
                          variant="primary"
                          onClick={handleAddToCartClick}
                          disabled={isProcessingCartAction || isCartLoading}
                          className="btn-add-to-cart btn-action shadow-sm"
                          style={{
                            backgroundColor: "var(--brand-primary, #c0392b)",
                            borderColor: "var(--brand-primary, #c0392b)",
                          }}
                        >
                          {isProcessingCartAction || isCartLoading ? (
                            <Spinner as="span" animation="border" size="sm" />
                          ) : (
                            <>
                              <CartPlusFill className="me-2" /> Tambah Keranjang
                            </>
                          )}
                        </Button>
                      </Col>
                    </Row>
                  </>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>

        <div className="product-info-tabs">
          <Nav
            variant="tabs"
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            justify
          >
            <Nav.Item>
              <Nav.Link eventKey="reviews">{`Ulasan Produk (${
                menuItem.ratingCount || 0
              })`}</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="related">Produk Terkait</Nav.Link>
            </Nav.Item>
          </Nav>
          <div
            className="tab-content"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="tab-content-wrapper"
              style={{
                transform: `translateX(${
                  activeTab === "reviews" ? "0%" : "-100%"
                })`,
              }}
            >
              <div className="tab-pane-wrapper">
                <ProductRatings
                  ratingsData={ratingsData}
                  isLoading={isLoadingRatings}
                  error={errorRatings}
                  currentUser={currentUser}
                  onEdit={handleShowEditModal}
                  onDelete={handleShowDeleteModal}
                />
              </div>
              <div className="tab-pane-wrapper">
                <RelatedProducts
                  products={relatedProducts}
                  isLoading={isLoadingRelated}
                  error={errorRelated}
                />
              </div>
            </div>
          </div>
        </div>
      </Container>

      <RatingModal
        show={showEditRatingModal}
        onHide={handleCloseEditModal}
        ratingToEdit={ratingToEdit}
        onSubmit={handleUpdateRating}
        isSubmitting={isSubmittingEdit}
        error={editError}
      />
      <DeleteRatingModal
        show={showDeleteConfirmModal}
        onHide={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </Container>
  );
}

export default DetailMenuPage;
