import React, { useState, useEffect, useCallback } from "react";
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
} from "../components/ui";
import {
  ChatDots,
  ExclamationTriangleFill,
  Shop as ShopIcon,
  ArrowClockwise,
  GeoAltFill,
  BoxSeam,
  ArrowLeft,
} from "react-bootstrap-icons";
import { getShopDetailById } from "../services/ShopService";
import { useAuth } from "../context/AuthContext";
import { handleShopImageError, handleProductImageError, handleAvatarError as handleOwnerAvatarError, FALLBACK_PRODUCT_IMAGE } from "../utils/imageFallback";

function ShopDetailPage({ onInitiateChat }) {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, isLoggedIn } = useAuth();

  const [shopInfo, setShopInfo] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [shopProducts, setShopProducts] = useState([]);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [errorShop, setErrorShop] = useState(null);
  const [isInitiatingChatProcess, setIsInitiatingChatProcess] = useState(false);

  const fetchShopDetails = useCallback(async () => {
    if (!shopId) {
      setErrorShop("ID Toko tidak ditemukan di URL.");
      setIsLoadingShop(false);
      return;
    }
    setIsLoadingShop(true);
    setErrorShop(null);
    setShopProducts([]);
    try {
      const response = await getShopDetailById(shopId);
      if (response && response.success && response.data) {
        setShopInfo(response.data.shop || null);
        setOwnerInfo(response.data.owner || null);
        setShopProducts(response.data.products || []);
        if (!response.data.shop) {
          setErrorShop("Data toko tidak ditemukan dalam respons.");
        }
      } else {
        setShopInfo(null);
        setOwnerInfo(null);
        setShopProducts([]);
        setErrorShop(
          response?.message ||
            "Gagal mengambil detail toko atau format respons tidak sesuai."
        );
      }
    } catch (err) {
      setErrorShop(
        err.message ||
          "Terjadi kesalahan pada server saat mengambil detail toko."
      );
      setShopInfo(null);
      setOwnerInfo(null);
      setShopProducts([]);
    } finally {
      setIsLoadingShop(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchShopDetails();
  }, [fetchShopDetails]);


  const handleChatWithOwner = async () => {
    if (!isLoggedIn) {
      navigate("/login", {
        state: { from: location, message: "Silakan login untuk memulai chat." },
      });
      return;
    }
    if (!ownerInfo || !ownerInfo.uid) {
      alert("Informasi pemilik toko tidak tersedia untuk memulai chat.");
      return;
    }
    if (currentUser && currentUser.uid === ownerInfo.uid) {
      alert("Anda tidak dapat memulai chat dengan diri sendiri.");
      return;
    }

    setIsInitiatingChatProcess(true);
    try {
      if (onInitiateChat) {
        onInitiateChat(ownerInfo.uid);
      }
    } catch (error) {
      console.error("Gagal memulai chat dari ShopDetailPage:", error);
      alert(error.message || "Gagal memulai percakapan.");
    } finally {
      setIsInitiatingChatProcess(false);
    }
  };

  if (isLoadingShop) {
    return (
      <Container fluid className="py-5 shop-detail-page-container-fluid">
        <Container className="text-center loading-spinner-container">
          <Spinner
            animation="border"
            style={{
              width: "4rem",
              height: "4rem",
              color: "var(--brand-primary)",
            }}
          />
          <p className="mt-3 text-lg" style={{ color: "var(--brand-primary)" }}>
            Memuat detail toko...
          </p>
        </Container>
      </Container>
    );
  }

  if (errorShop && !shopInfo) {
    return (
      <Container fluid className="py-5 shop-detail-page-container-fluid">
        <Container>
          <Alert variant="danger" className="text-center text-lg py-4 shadow-sm">
            <Alert.Heading as="h3">
              <ExclamationTriangleFill className="me-2" />
              Oops! Gagal Memuat Data Toko
            </Alert.Heading>
            <p>{errorShop}</p>
            <Button
              as={Link}
              to="/toko"
              variant="outline-primary"
              className="font-semibold me-2"
            >
              <ArrowLeft className="me-1" />
              Kembali ke Daftar Toko
            </Button>
            <Button
              onClick={fetchShopDetails}
              variant="primary"
              className="font-semibold"
            >
              <ArrowClockwise className="me-2" />
              Coba Lagi
            </Button>
          </Alert>
        </Container>
      </Container>
    );
  }

  if (!shopInfo) {
    return (
      <Container fluid className="py-5 shop-detail-page-container-fluid">
        <Container>
          <Alert variant="warning" className="text-center text-lg py-4 shadow-sm">
            <Alert.Heading as="h3">
              <ShopIcon className="me-2" />
              Toko Tidak Ditemukan
            </Alert.Heading>
            <p>
              Detail untuk toko ini tidak dapat ditemukan atau URL tidak valid.
            </p>
            <Button
              as={Link}
              to="/toko"
              variant="outline-primary"
              className="font-semibold"
            >
              <ArrowLeft className="me-1" />
              Kembali ke Daftar Toko
            </Button>
          </Alert>
        </Container>
      </Container>
    );
  }

  const canChatWithOwner =
    isLoggedIn &&
    ownerInfo &&
    ownerInfo.uid &&
    currentUser?.uid !== ownerInfo.uid;

  return (
    <Container fluid className="py-4 lg:px-5 shop-detail-page-container-fluid">
      <Container>
        <Breadcrumb
          listProps={{ className: "bg-transparent px-0 py-2 mb-3" }}
          className="breadcrumb-custom"
        >
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
            Home
          </Breadcrumb.Item>
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/toko" }}>
            Toko
          </Breadcrumb.Item>
          <Breadcrumb.Item active>{shopInfo.shopName}</Breadcrumb.Item>
        </Breadcrumb>

        <Card className="shop-detail-main-card border-0 shadow-lg mb-5">
          {shopInfo.bannerImageURL ? (
            <div className="shop-banner-img-container">
              <Image
                src={shopInfo.bannerImageURL}
                alt={`Banner ${shopInfo.shopName}`}
                className="shop-banner-img"
                onError={handleShopImageError}
                fluid
              />
            </div>
          ) : (
            <div className="shop-banner-img-container shop-banner-placeholder">
              <Image
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                  shopInfo.shopName || "Toko"
                )}&size=1200&background=efefef&color=757575&font-size=0.2&length=2&bold=true&format=svg`}
                alt={`Placeholder Banner ${shopInfo.shopName}`}
                className="shop-banner-img placeholder-img"
                fluid
              />
            </div>
          )}
          <Card.Body className="md:p-4 p-3">
            <Row>
              <Col md={8} className="shop-info-section">
                <div className="flex flex-wrap items-center justify-between mb-3">
                  <h1 className="shop-title h2 mb-2 me-3">
                    {shopInfo.shopName}
                  </h1>
                  {canChatWithOwner && (
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="btn-chat-owner"
                      onClick={handleChatWithOwner}
                      disabled={isInitiatingChatProcess}
                    >
                      {isInitiatingChatProcess ? (
                        <Spinner
                          as="span"
                          animation="border"
                          size="sm"
                          role="status"
                          aria-hidden="true"
                          className="me-1"
                        />
                      ) : (
                        <ChatDots className="me-1" />
                      )}
                      Chat Penjual
                    </Button>
                  )}
                </div>

                <p className="shop-description text-lg text-muted mb-3">
                  {shopInfo.description || "Deskripsi toko tidak tersedia."}
                </p>
                {shopInfo.shopAddress && (
                  <p className="shop-address mb-2 text-muted">
                    <GeoAltFill className="me-2 text-primary" />
                    {shopInfo.shopAddress}
                  </p>
                )}
                <p className="shop-timestamps text-muted text-sm">
                  Bergabung pada:{" "}
                  {new Date(shopInfo.createdAt).toLocaleDateString("id-ID", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </Col>
              {ownerInfo && (
                <Col md={4} className="owner-info-sidebar mt-4 md:mt-0 md:ps-4">
                  <Card className="owner-info-card border-0 bg-light shadow-sm">
                    <Card.Body className="text-center p-3">
                      <h5 className="card-title mb-3 text-muted">
                        Pemilik Toko
                      </h5>
                      <Image
                        src={
                          ownerInfo.photoURL ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            ownerInfo.displayName || "P"
                          )}&size=90&background=bdbdbd&color=fff&font-size=0.5&length=2&bold=true`
                        }
                        alt={ownerInfo.displayName || "Pemilik"}
                        roundedCircle
                        className="owner-avatar mb-2 shadow-sm bg-secondary"
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          border: "3px solid white",
                        }}
                        onError={(e) =>
                          handleOwnerAvatarError(e, ownerInfo.displayName)
                        }
                      />
                      <p className="owner-name h5 mb-0 mt-2">
                        {ownerInfo.displayName || "Nama Pemilik Tidak Ada"}
                      </p>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>

        <div className="shop-products-section mt-5 pt-3">
          <h2 className="text-center mb-4 section-title-products h3">
            <BoxSeam className="me-2" /> Menu dari Toko Ini
          </h2>

          {!isLoadingShop && errorShop && shopProducts.length === 0 && (
            <Alert variant="info" className="text-center shadow-sm">
              Informasi menu dari toko ini tidak dapat dimuat saat ini karena
              ada masalah dengan data toko utama. Silakan coba lagi.
            </Alert>
          )}

          {!isLoadingShop && !errorShop && shopProducts.length > 0 ? (
            <Row xs={1} sm={2} md={3} lg={4} className="gap-6">
              {shopProducts.map((product) => (
                <Col
                  key={product.productId}
                  className="flex items-stretch"
                >
                  <Card className="w-full h-full product-list-card shop-card shadow-sm">
                    <div className="shop-card-img-wrapper">
                      <Card.Img
                        variant="top"
                        className="shop-card-img"
                        src={product.imageUrl || FALLBACK_PRODUCT_IMAGE}
                        onError={handleProductImageError}
                        alt={product.name}
                      />
                    </div>
                    <Card.Body className="flex flex-col p-3">
                      {product.category && (
                        <Badge
                          pill
                          bg="light"
                          text="dark"
                          className="mb-2 product-category-badge self-start shadow-sm"
                        >
                          {product.category}
                        </Badge>
                      )}
                      <Card.Title
                        as="h5"
                        className="product-list-card-title shop-card-title grow"
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
                        <p className="text-muted text-sm mb-2">
                          Stok:{" "}
                          {product.stock > 0 ? (
                            product.stock
                          ) : (
                            <span className="text-danger font-bold">Habis</span>
                          )}
                        </p>
                        <Button
                          variant="primary"
                          className="btn-brand w-full mt-1"
                          as={Link}
                          to={`/menu/${product.productId}`}
                          disabled={product.stock === 0}
                        >
                          {product.stock > 0 ? "Lihat Detail" : "Stok Habis"}
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            !isLoadingShop &&
            !errorShop && (
              <Alert variant="info" className="text-center shadow-sm py-4">
                <BoxSeam size={30} className="mb-2 text-muted" />
                <p className="mb-0 text-lg">
                  Toko ini belum memiliki menu yang diunggah.
                </p>
              </Alert>
            )
          )}
        </div>
      </Container>
    </Container>
  );
}

export default ShopDetailPage;