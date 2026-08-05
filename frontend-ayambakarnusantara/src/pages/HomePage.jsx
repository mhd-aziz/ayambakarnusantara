import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Card,
  Spinner,
  Badge,
  Form,
  Alert,
} from "../components/ui";
import { Link } from "react-router-dom";
import { getProducts } from "../services/MenuService";
import { getAllRatings } from "../services/RatingService";
import { sendFeedback } from "../services/FeedbackService";
import {
  Star,
  StarFill,
  StarHalf,
  ChevronLeft,
  ChevronRight,
  SendFill,
  CheckCircleFill,
  ExclamationTriangleFill,
} from "react-bootstrap-icons";
import { FALLBACK_AVATAR_IMAGE, FALLBACK_PRODUCT_IMAGE, handleProductImageError as handleImageError, handleAvatarError } from "../utils/imageFallback";

const heroBackgroundImageUrl = "/images/hero-background.jpg";

const StarRatingDisplay = ({ rating, size = 16 }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="inline-block" style={{ color: "#ffc107" }}>
      {[...Array(fullStars)].map((_, i) => (
        <StarFill key={`full-${i}`} size={size} className="me-1" />
      ))}
      {halfStar && <StarHalf key="half" size={size} className="me-1" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className="me-1" />
      ))}
    </div>
  );
};

const RatingCard = ({ rating }) => {
  return (
    <div className="rating-card-wrapper">
      <Card className="w-full h-full text-center p-3 testimonial-card shadow-sm">
        <Card.Img
          variant="top"
          src={rating.userPhotoURL || FALLBACK_AVATAR_IMAGE}
          alt={rating.userDisplayName || "Pengguna"}
          className="rounded-full mx-auto mb-3"
          style={{
            width: "80px",
            height: "80px",
            objectFit: "cover",
            border: "3px solid #C07722",
          }}
          onError={handleAvatarError}
        />
        <Card.Body className="flex flex-col">
          <Card.Title as="h5" className="h6 mb-1">
            {rating.userDisplayName || "Pengguna Anonim"}
          </Card.Title>
          <div className="mb-2">
            <StarRatingDisplay rating={rating.ratingValue} size={18} />
          </div>
          <blockquote className="blockquote mb-0 grow flex items-center justify-center">
            <p className="text-sm italic mb-0">
              "
              {rating.reviewText ||
                "Pengguna ini tidak memberikan ulasan teks."}
              "
            </p>
          </blockquote>
        </Card.Body>
      </Card>
    </div>
  );
};

function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRecommendationsLoading, setIsRecommendationsLoading] =
    useState(true);
  const [recommendationsError, setRecommendationsError] = useState(null);
  const [isRatingsLoading, setIsRatingsLoading] = useState(true);
  const [ratingsError, setRatingsError] = useState(null);
  const ratingsContainerRef = useRef(null);

  const [feedbackData, setFeedbackData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");

  const fetchFeaturedProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProducts({
        limit: 8,
        sortBy: "name",
        order: "asc",
      });
      if (response && response.data && Array.isArray(response.data.products)) {
        setFeaturedProducts(response.data.products);
      } else {
        setError("Gagal memuat data produk unggulan.");
      }
    } catch (err) {
      setError(
        err.message ||
          "Terjadi kesalahan pada server saat mengambil produk unggulan."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecommendedProducts = useCallback(async () => {
    setIsRecommendationsLoading(true);
    setRecommendationsError(null);
    try {
      const response = await getProducts({
        limit: 4,
        sortBy: "averageRating",
        order: "desc",
      });
      if (response && response.data && Array.isArray(response.data.products)) {
        const productsWithRating = response.data.products.filter(
          (p) => p.averageRating > 0
        );
        setRecommendedProducts(productsWithRating);
      } else {
        setRecommendationsError("Gagal memuat data produk rekomendasi.");
      }
    } catch (err) {
      setRecommendationsError(
        err.message ||
          "Terjadi kesalahan pada server saat mengambil produk rekomendasi."
      );
    } finally {
      setIsRecommendationsLoading(false);
    }
  }, []);

  const fetchRatings = useCallback(async () => {
    setIsRatingsLoading(true);
    setRatingsError(null);
    try {
      const response = await getAllRatings({
        sortBy: "createdAt",
        order: "desc",
      });
      if (
        response &&
        response.success &&
        Array.isArray(response.data.ratings)
      ) {
        setRatings(response.data.ratings);
      } else {
        setRatingsError("Gagal memuat data ulasan.");
      }
    } catch (err) {
      setRatingsError(
        err.message || "Terjadi kesalahan pada server saat mengambil ulasan."
      );
    } finally {
      setIsRatingsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturedProducts();
    fetchRecommendedProducts();
    fetchRatings();
  }, [fetchFeaturedProducts, fetchRecommendedProducts, fetchRatings]);


  const scrollRatings = (direction) => {
    if (ratingsContainerRef.current) {
      const scrollAmount = direction === "left" ? -320 : 320;
      ratingsContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedbackData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingFeedback(true);
    setFeedbackError("");
    setFeedbackSuccess("");
    try {
      const response = await sendFeedback(feedbackData);
      if (response.success) {
        setFeedbackSuccess(response.message);
        setFeedbackData({ name: "", email: "", subject: "", message: "" });
      } else {
        setFeedbackError(response.message || "Gagal mengirim pesan.");
      }
    } catch (err) {
      setFeedbackError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const ProductCard = ({ product, showRating = false }) => (
    <Col className="flex items-stretch">
      <Card className="w-full product-card">
        <Card.Img
          variant="top"
          src={
            product.productImageURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              product.name
            )}&background=f0f2f5&color=757575&size=400`
          }
          onError={(e) => handleImageError(e, product.name)}
          alt={product.name}
        />
        <Card.Body className="flex flex-col p-3">
          {product.category && (
            <Badge
              pill
              bg="light"
              text="dark"
              className="mb-2 badge-category self-start"
            >
              {product.category}
            </Badge>
          )}
          <Card.Title as="h3" className="h6 mb-2 grow">
            {product.name}
          </Card.Title>

          {showRating && product.averageRating > 0 && (
            <div className="mb-2">
              <StarRatingDisplay rating={product.averageRating} size={15} />
              <span className="ms-2 text-muted" style={{ fontSize: "0.8rem" }}>
                ({product.ratingCount || 0})
              </span>
            </div>
          )}

          <div className="mt-auto">
            <p className="price mb-3">
              Rp {product.price.toLocaleString("id-ID")}
            </p>
            <Button
              variant="outline-secondary"
              size="sm"
              className="w-full btn-detail"
              as={Link}
              to={`/menu/${product._id}`}
            >
              Lihat Detail
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );

  const renderProductSection = (loading, error, products, showRating) => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner
            animation="border"
            style={{ width: "3rem", height: "3rem", color: "#c07722" }}
          />
        </div>
      );
    }
    if (error || products.length === 0) {
      return null;
    }
    return (
      <Row xs={1} sm={2} md={3} lg={4} className="gap-6">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            showRating={showRating}
          />
        ))}
      </Row>
    );
  };

  const renderRatingsSection = (loading, error, ratingsData) => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner
            animation="border"
            style={{ width: "3rem", height: "3rem", color: "#c07722" }}
          />
        </div>
      );
    }
    if (error || ratingsData.length === 0) {
      return null;
    }
    return (
      <div className="horizontal-scroll-wrapper">
        <div className="horizontal-scroll-container" ref={ratingsContainerRef}>
          <div className="flex flex-nowrap">
            {ratingsData.map((rating) => (
              <RatingCard key={rating.ratingId} rating={rating} />
            ))}
          </div>
        </div>
        <div className="scroll-button-container">
          <Button
            className="scroll-button left"
            onClick={() => scrollRatings("left")}
            aria-label="Geser ke kiri"
          >
            <ChevronLeft />
          </Button>
          <Button
            className="scroll-button right"
            onClick={() => scrollRatings("right")}
            aria-label="Geser ke kanan"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    );
  };
  return (
    <>
      <div
        className="hero-section"
        style={{ backgroundImage: `url(${heroBackgroundImageUrl})` }}
      >
        <div className="hero-overlay"></div>
        <Container className="hero-content text-center">
          <Row className="justify-center">
            <Col md={10} lg={8}>
              <h1 className="hero-title">AYAM BAKAR NUSANTARA</h1>
              <p className="hero-subtitle">
                Satu Website, Beragam Rasa: Ayam Bakar Nusantara Menghadirkan
                Keunikan Setiap Daerah!
              </p>
              <p className="hero-description">
                Pesan ayam bakar dengan berbagai rasa khas daerah dan nikmati
                pengalaman kuliner yang tak terlupakan.
              </p>
              <Button
                as={Link}
                to="/menu"
                variant="primary"
                size="lg"
                className="hero-cta-button"
              >
                Pesan Sekarang!
              </Button>
            </Col>
          </Row>
        </Container>
      </div>

      <div className="page-section">
        <Container className="py-5">
          {recommendedProducts.length > 0 && !isRecommendationsLoading && (
            <>
              <h2 className="text-center mb-5 section-title">
                <span>REKOMENDASI UNTUK ANDA</span>
              </h2>
              {renderProductSection(
                isRecommendationsLoading,
                recommendationsError,
                recommendedProducts,
                true
              )}
            </>
          )}
        </Container>
      </div>

      <div className="section-divider-wrapper">
        <Container>
          <hr className="section-divider" />
        </Container>
      </div>

      <div className="page-section">
        <Container className="py-5">
          <h2 className="text-center mb-5 section-title">
            <span>MENU UNGGULAN KAMI</span>
          </h2>
          {renderProductSection(isLoading, error, featuredProducts, false)}
          <div className="text-center mt-5">
            <Button
              as={Link}
              to="/menu"
              variant="primary"
              size="lg"
              className="btn-brand"
            >
              Lihat Semua Menu
            </Button>
          </div>
        </Container>
      </div>

      {ratings.length > 0 && !isRatingsLoading && (
        <div className="page-section testimonials-section py-5">
          <Container>
            <h2 className="text-center mb-5 section-title">
              <span>APA KATA PELANGGAN KAMI?</span>
            </h2>
            {renderRatingsSection(isRatingsLoading, ratingsError, ratings)}
          </Container>
        </div>
      )}

      <div id="hubungi-kami" className="page-section contact-section py-5">
        <Container>
          <Row className="justify-center">
            <Col md={8} lg={6}>
              <h2 className="text-center mb-4 section-title">
                <span>Hubungi Kami</span>
              </h2>
              <p className="text-center text-muted mb-4">
                Jika ada masukan atau saran, jangan ragu untuk memberikan kami
                feedback melalui form di bawah ini.
              </p>
              <Card className="p-4 shadow-sm">
                <Card.Body>
                  {feedbackSuccess && (
                    <Alert variant="success">
                      <CheckCircleFill className="me-2" />
                      {feedbackSuccess}
                    </Alert>
                  )}
                  {feedbackError && (
                    <Alert variant="danger">
                      <ExclamationTriangleFill className="me-2" />
                      {feedbackError}
                    </Alert>
                  )}
                  <Form onSubmit={handleFeedbackSubmit}>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="feedbackName">
                          <Form.Label>Nama Anda</Form.Label>
                          <Form.Control
                            type="text"
                            name="name"
                            value={feedbackData.name}
                            onChange={handleFeedbackChange}
                            required
                            disabled={isSubmittingFeedback}
                            placeholder="Nama Lengkap"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3" controlId="feedbackEmail">
                          <Form.Label>Email Anda</Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={feedbackData.email}
                            onChange={handleFeedbackChange}
                            required
                            disabled={isSubmittingFeedback}
                            placeholder="nama_email@gmail.com"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Form.Group className="mb-3" controlId="feedbackSubject">
                      <Form.Label>Subjek</Form.Label>
                      <Form.Control
                        type="text"
                        name="subject"
                        value={feedbackData.subject}
                        onChange={handleFeedbackChange}
                        required
                        disabled={isSubmittingFeedback}
                        placeholder="Judul pesan Anda"
                      />
                    </Form.Group>
                    <Form.Group className="mb-3" controlId="feedbackMessage">
                      <Form.Label>Pesan</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={5}
                        name="message"
                        value={feedbackData.message}
                        onChange={handleFeedbackChange}
                        required
                        disabled={isSubmittingFeedback}
                        placeholder="Tuliskan pesan Anda di sini..."
                      />
                    </Form.Group>
                    <Button
                      variant="primary"
                      type="submit"
                      className="w-full btn-brand"
                      disabled={isSubmittingFeedback}
                    >
                      {isSubmittingFeedback ? (
                        <>
                          <Spinner size="sm" as="span" className="me-2" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          <SendFill className="me-2" />
                          Kirim Pesan
                        </>
                      )}
                    </Button>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
}

export default HomePage;