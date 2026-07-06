import React, { useState, useEffect, useCallback } from "react";
import {
  useParams,
  Link,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Spinner,
  Alert,
  Breadcrumb,
  Button,
} from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import {
  getCustomerOrderDetailById,
  cancelOrderAsCustomer,
} from "../services/OrderService";
import {
  createMidtransTransaction,
  getMidtransTransactionStatus,
} from "../services/PaymentService";
import { addRating } from "../services/RatingService";
import { CheckCircleFill } from "react-bootstrap-icons";
import OrderDetailCard from "../components/Order/OrderDetailCard";
import OrderItemsList from "../components/Order/OrderItemsList";
import ShopDetailsCard from "../components/Order/ShopDetailsCard";
import SupportCard from "../components/Order/SupportCard";
import CancelOrderModal from "../components/Order/CancelOrderModal";
import RatingModal from "../components/Order/RatingModal";
import PaymentProofViewer from "../components/Order/PaymentProofViewer";
import "../css/OrderDetailPage.css";
import { handleProductSmallImageError as handleImageError } from "../utils/imageFallback";

function OrderDetailPage({ onOpenChatbot }) {
  const { orderId } = useParams();
  const { isLoggedIn, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orderDetails, setOrderDetails] = useState(null);
  const [shopDetails, setShopDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [paymentTransactionDetails, setPaymentTransactionDetails] =
    useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [productToRate, setProductToRate] = useState(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [ratingSuccess, setRatingSuccess] = useState("");

  const fetchOrderDetails = useCallback(
    async (shouldFetchPaymentStatus = false) => {
      if (!isLoggedIn) {
        navigate("/login", { state: { from: location.pathname } });
        return;
      }
      if (!orderId) {
        setError("ID Pesanan tidak ditemukan di URL.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      if (shouldFetchPaymentStatus) {
        setPaymentError("");
        setStatusMessage("");
        setPaymentTransactionDetails(null);
      }

      try {
        const response = await getCustomerOrderDetailById(orderId);
        if (response?.success && response.data?.order) {
          const fetchedOrderDetails = response.data.order;
          setOrderDetails(fetchedOrderDetails);
          setShopDetails(response.data.shopDetails || {});

          const isOnlinePayment =
            fetchedOrderDetails.paymentDetails?.method === "ONLINE_PAYMENT";

          if (shouldFetchPaymentStatus && isOnlinePayment) {
            setIsCheckingStatus(true);
            setStatusMessage("Memeriksa status pembayaran...");
            try {
              const statusResponse = await getMidtransTransactionStatus(
                fetchedOrderDetails.orderId
              );
              if (statusResponse?.success && statusResponse.data) {
                setPaymentTransactionDetails(statusResponse.data);
                setStatusMessage(
                  statusResponse.message || "Status pembayaran berhasil dimuat."
                );
                if (
                  fetchedOrderDetails.orderStatus !==
                    statusResponse.data.internalOrderStatus ||
                  fetchedOrderDetails.paymentDetails?.status !==
                    statusResponse.data.internalPaymentStatus
                ) {
                  setOrderDetails((prevOrder) => ({
                    ...prevOrder,
                    orderStatus: statusResponse.data.internalOrderStatus,
                    paymentDetails: {
                      ...prevOrder.paymentDetails,
                      status: statusResponse.data.internalPaymentStatus,
                      transactionId:
                        statusResponse.data.paymentGatewayStatus
                          ?.transaction_id ||
                        prevOrder.paymentDetails?.transactionId,
                    },
                  }));
                }
              } else {
                setPaymentError(
                  statusResponse?.message || "Gagal memuat status pembayaran."
                );
                setStatusMessage("");
              }
            } catch (statusErr) {
              setPaymentError(
                statusErr.message ||
                  "Terjadi kesalahan saat memeriksa status pembayaran."
              );
              setStatusMessage("");
            } finally {
              setIsCheckingStatus(false);
            }
          } else {
            setStatusMessage("");
          }
        } else {
          setError(
            response?.message ||
              "Gagal memuat detail pesanan. Pesanan tidak ditemukan atau Anda tidak memiliki akses."
          );
          setOrderDetails(null);
          setShopDetails(null);
        }
      } catch (err) {
        setError(
          err.message ||
            "Terjadi kesalahan pada server saat mengambil detail pesanan."
        );
      } finally {
        setIsLoading(false);
      }
    },
    [orderId, isLoggedIn, navigate, location.pathname]
  );

  useEffect(() => {
    fetchOrderDetails(true);
  }, [fetchOrderDetails]);


  const handleShowCancelModal = () => {
    setCancelError("");
    setCancelSuccessMessage("");
    setShowCancelModal(true);
  };
  const handleCloseCancelModal = () => setShowCancelModal(false);

  const handleShowRatingModal = (product) => {
    setProductToRate(product);
    setRatingValue(0);
    setReviewText("");
    setRatingError("");
    setRatingSuccess("");
    setShowRatingModal(true);
  };

  const handleCloseRatingModal = () => {
    setShowRatingModal(false);
    setProductToRate(null);
  };

  const handleRatingSubmit = async () => {
    if (!productToRate || ratingValue === 0) {
      setRatingError("Rating bintang wajib diisi.");
      return;
    }
    setIsSubmittingRating(true);
    setRatingError("");
    setRatingSuccess("");

    try {
      const ratingData = {
        orderId: orderDetails.orderId,
        ratingValue,
        reviewText,
      };
      const response = await addRating(productToRate.productId, ratingData);
      if (response && response.success) {
        setRatingSuccess(
          response.message || "Rating dan ulasan berhasil dikirim!"
        );
        fetchOrderDetails(true);
        setTimeout(() => {
          handleCloseRatingModal();
        }, 2000);
      } else {
        setRatingError(response?.message || "Gagal mengirim rating.");
      }
    } catch (err) {
      setRatingError(
        err.message || "Terjadi kesalahan server saat mengirim rating."
      );
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderDetails) return;
    setIsCancelling(true);
    setCancelError("");
    setCancelSuccessMessage("");
    try {
      const response = await cancelOrderAsCustomer(orderDetails.orderId);
      if (response && response.success) {
        setCancelSuccessMessage(
          response.message || "Pesanan berhasil dibatalkan."
        );
        setOrderDetails((prevDetails) => ({
          ...prevDetails,
          orderStatus: response.data?.orderStatus || "CANCELLED",
          paymentDetails:
            response.data?.paymentDetails || prevDetails.paymentDetails,
        }));
        setPaymentTransactionDetails(null);
        setTimeout(() => {
          setCancelSuccessMessage("");
          if (response.data?.orderStatus === "CANCELLED") {
            fetchOrderDetails(true);
          }
        }, 3000);
        handleCloseCancelModal();
      } else {
        setCancelError(response?.message || "Gagal membatalkan pesanan.");
      }
    } catch (err) {
      setCancelError(
        err.message || "Terjadi kesalahan server saat membatalkan pesanan."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePayOnline = async () => {
    if (!orderDetails || !orderDetails.orderId) return;
    setIsProcessingPayment(true);
    setPaymentError("");
    setStatusMessage("");
    try {
      const paymentResponse = await createMidtransTransaction(
        orderDetails.orderId
      );
      if (
        paymentResponse &&
        paymentResponse.data &&
        paymentResponse.data.redirect_url
      ) {
        window.open(
          paymentResponse.data.redirect_url,
          "_blank",
          "noopener,noreferrer"
        );
        setStatusMessage(
          paymentResponse.message ||
            "Anda akan diarahkan ke halaman pembayaran. Setelah pembayaran, silakan cek status di halaman ini."
        );
      } else {
        setPaymentError(
          paymentResponse?.message ||
            "Gagal memulai pembayaran. URL redirect tidak ditemukan."
        );
      }
    } catch (err) {
      setPaymentError(
        err.message || "Terjadi kesalahan saat memulai pembayaran."
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleCheckPaymentStatusManual = async () => {
    if (!orderDetails || !orderDetails.orderId) return;
    setIsCheckingStatus(true);
    setPaymentError("");
    setStatusMessage("Sedang memperbarui status pembayaran...");
    try {
      const statusResponse = await getMidtransTransactionStatus(
        orderDetails.orderId
      );
      if (statusResponse && statusResponse.success && statusResponse.data) {
        setPaymentTransactionDetails(statusResponse.data);
        setStatusMessage(
          statusResponse.message || "Status pembayaran berhasil diperbarui."
        );
        if (
          orderDetails.orderStatus !==
            statusResponse.data.internalOrderStatus ||
          orderDetails.paymentDetails?.status !==
            statusResponse.data.internalPaymentStatus
        ) {
          setOrderDetails((prevOrder) => ({
            ...prevOrder,
            orderStatus: statusResponse.data.internalOrderStatus,
            paymentDetails: {
              ...prevOrder.paymentDetails,
              status: statusResponse.data.internalPaymentStatus,
              transactionId:
                statusResponse.data.paymentGatewayStatus?.transaction_id ||
                prevOrder.paymentDetails?.transactionId,
            },
          }));
        }
      } else {
        setPaymentError(
          statusResponse?.message || "Gagal memeriksa status pembayaran."
        );
        setStatusMessage("");
      }
    } catch (err) {
      setPaymentError(
        err.message || "Terjadi kesalahan saat memeriksa status pembayaran."
      );
      setStatusMessage("");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const orderStatusIndonesian = {
    PENDING_CONFIRMATION: "Menunggu Konfirmasi",
    AWAITING_PAYMENT: "Menunggu Pembayaran",
    CONFIRMED: "Terkonfirmasi",
    PROCESSING: "Sedang Diproses",
    PREPARING: "Sedang Disiapkan",
    READY_FOR_PICKUP: "Siap Diambil",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
    PAYMENT_PENDING: "Pembayaran Tertunda",
    PAYMENT_FAILED: "Pembayaran Gagal",
    UNKNOWN: "Tidak Diketahui",
  };

  const paymentStatusIndonesian = {
    awaiting_gateway_interaction: "Menunggu Pembayaran",
    pending_gateway_payment: "Menunggu Pembayaran",
    awaiting_payment_confirmation: "Menunggu Konfirmasi Pembayaran",
    paid: "Lunas",
    pay_on_pickup: "Bayar di Tempat",
    failed: "Gagal",
    cancelled: "Dibatalkan",
    expired: "Kadaluarsa",
  };

  const paymentGatewayStatusIndonesian = {
    capture: "Ditangkap",
    settlement: "Berhasil",
    pending: "Tertunda",
    deny: "Ditolak",
    cancel: "Batal",
    expire: "Kadaluarsa",
    failure: "Gagal",
    refund: "Dikembalikan",
    partial_refund: "Dikembalikan Sebagian",
    authorize: "Otorisasi",
  };

  const getDisplayOrderStatus = (statusKey) => {
    return (
      orderStatusIndonesian[statusKey] ||
      statusKey?.replace(/_/g, " ") ||
      "Tidak Ada"
    );
  };

  const getDisplayPaymentStatus = (statusKey) => {
    return (
      paymentStatusIndonesian[statusKey] ||
      statusKey?.replace(/_/g, " ") ||
      "Tidak Ada"
    );
  };

  const getDisplayPaymentGatewayStatus = (statusKey) => {
    return (
      paymentGatewayStatusIndonesian[statusKey] ||
      statusKey?.replace(/_/g, " ") ||
      "Tidak Ada"
    );
  };

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "PENDING_CONFIRMATION":
      case "AWAITING_PAYMENT":
        return "warning";
      case "CONFIRMED":
        return "info";
      case "PROCESSING":
      case "PREPARING":
        return "primary";
      case "READY_FOR_PICKUP":
      case "COMPLETED":
        return "success";
      case "CANCELLED":
      case "PAYMENT_FAILED":
        return "danger";
      case "PAYMENT_PENDING":
        return "secondary";
      default:
        return "light";
    }
  };

  if (!isLoggedIn && !isLoading) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isLoading && !orderDetails) {
    return (
      <Container className="text-center py-5">
        <Spinner
          animation="border"
          style={{
            width: "3rem",
            height: "3rem",
            color: "var(--brand-primary)",
          }}
        />
        <p className="mt-3 lead" style={{ color: "var(--brand-primary)" }}>
          Memuat Detail Pesanan...
        </p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="text-center py-5">
        <Alert variant="danger">
          <Alert.Heading>Oops! Terjadi Kesalahan</Alert.Heading>
          <p>{error}</p>
          <Button
            onClick={() => fetchOrderDetails(true)}
            variant="primary"
            className="me-2"
          >
            Coba Lagi
          </Button>
          <Button as={Link} to="/pesanan" variant="secondary">
            Kembali ke Daftar Pesanan
          </Button>
        </Alert>
      </Container>
    );
  }

  if (!orderDetails && !isLoading) {
    return (
      <Container className="text-center py-5">
        <Alert variant="warning">
          Pesanan tidak ditemukan atau gagal dimuat.
        </Alert>
        <Button as={Link} to="/pesanan" variant="primary">
          Kembali ke Daftar Pesanan
        </Button>
      </Container>
    );
  }

  const isActionInProgress =
    isCancelling || isProcessingPayment || isCheckingStatus;
  const cancellableStatuses = ["AWAITING_PAYMENT", "PENDING_CONFIRMATION"];
  const canCancelOrder =
    orderDetails && cancellableStatuses.includes(orderDetails.orderStatus);
  const showPayNowButton =
    orderDetails?.paymentDetails?.method === "ONLINE_PAYMENT" &&
    orderDetails.orderStatus === "AWAITING_PAYMENT";
  const showCheckStatusButton =
    orderDetails?.paymentDetails?.method === "ONLINE_PAYMENT" &&
    !["COMPLETED", "CANCELLED", "PAYMENT_FAILED"].includes(
      orderDetails.orderStatus
    );

  return (
    <Container className="my-4 order-detail-page">
      {cancelSuccessMessage && (
        <Alert
          variant="success"
          onClose={() => setCancelSuccessMessage("")}
          dismissible
          className="position-fixed top-0 start-50 translate-middle-x mt-3 z-index-toast"
          style={{ zIndex: 1055 }}
        >
          <CheckCircleFill className="me-2" />
          {cancelSuccessMessage}
        </Alert>
      )}
      <Breadcrumb className="breadcrumb-custom mb-4">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
          Beranda
        </Breadcrumb.Item>
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/pesanan" }}>
          Pesanan Saya
        </Breadcrumb.Item>
        <Breadcrumb.Item active>
          Detail Pesanan #{orderDetails.orderId?.substring(0, 20)}
        </Breadcrumb.Item>
      </Breadcrumb>

      {paymentError && (
        <Alert variant="danger" onClose={() => setPaymentError("")} dismissible>
          {paymentError}
        </Alert>
      )}
      {statusMessage && (
        <Alert variant="info" onClose={() => setStatusMessage("")} dismissible>
          {statusMessage}
        </Alert>
      )}

      <Row>
        <Col lg={8}>
          <OrderDetailCard
            orderDetails={orderDetails}
            user={user}
            getDisplayOrderStatus={getDisplayOrderStatus}
            getStatusBadgeVariant={getStatusBadgeVariant}
            getDisplayPaymentStatus={getDisplayPaymentStatus}
            paymentTransactionDetails={paymentTransactionDetails}
            getDisplayPaymentGatewayStatus={getDisplayPaymentGatewayStatus}
            isActionInProgress={isActionInProgress}
            canCancelOrder={canCancelOrder}
            showPayNowButton={showPayNowButton}
            showCheckStatusButton={showCheckStatusButton}
            onCancel={handleShowCancelModal}
            onPay={handlePayOnline}
            onCheckStatus={handleCheckPaymentStatusManual}
          />
          <OrderItemsList
            items={orderDetails.items}
            shopDetails={shopDetails}
            orderStatus={orderDetails.orderStatus}
            onShowRatingModal={handleShowRatingModal}
            handleImageError={handleImageError}
          />
        </Col>
        <Col lg={4}>
          <ShopDetailsCard
            shopDetails={shopDetails}
            orderItems={orderDetails.items}
            handleImageError={handleImageError}
          />

          {orderDetails && (
            <PaymentProofViewer
              orderId={orderDetails.orderId}
              paymentDetails={orderDetails.paymentDetails}
            />
          )}
          <SupportCard onOpenChatbot={onOpenChatbot} />
        </Col>
      </Row>

      <CancelOrderModal
        show={showCancelModal}
        onHide={handleCloseCancelModal}
        onConfirm={handleConfirmCancelOrder}
        isCancelling={isCancelling}
        error={cancelError}
      />

      <RatingModal
        show={showRatingModal}
        onHide={handleCloseRatingModal}
        productToRate={productToRate}
        ratingValue={ratingValue}
        setRatingValue={setRatingValue}
        reviewText={reviewText}
        setReviewText={setReviewText}
        isSubmitting={isSubmittingRating}
        error={ratingError}
        success={ratingSuccess}
        onSubmit={handleRatingSubmit}
      />
    </Container>
  );
}

export default OrderDetailPage;
