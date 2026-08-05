import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Alert,
  Card,
  Button,
  Spinner,
  ListGroup,
  Badge,
  Row,
  Col,
} from "react-bootstrap";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getUserOrders } from "../services/OrderService";
import { createMidtransTransaction } from "../services/PaymentService";
import { BasketFill, CreditCard } from "react-bootstrap-icons";
import "../css/OrderPage.css";

function OrderPage() {
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingPaymentOrderId, setProcessingPaymentOrderId] =
    useState(null);

  const fetchOrders = useCallback(async () => {
    if (!isLoggedIn) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await getUserOrders();
      if (Array.isArray(response)) {
        setOrders(response);
      } else if (response && response.success && Array.isArray(response.data)) {
        setOrders(response.data);
      } else if (
        response &&
        response.message === "Anda belum memiliki pesanan." &&
        Array.isArray(response.data) &&
        response.data.length === 0
      ) {
        setOrders([]);
      } else {
        setOrders([]);
        setError(
          response?.message ||
            "Format data pesanan tidak sesuai atau terjadi kesalahan."
        );
      }
    } catch (err) {
      setOrders([]);
      setError(
        err.message || "Terjadi kesalahan saat mengambil daftar pesanan."
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

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

  const getDisplayOrderStatus = (statusKey) => {
    return (
      orderStatusIndonesian[statusKey] || statusKey?.replace(/_/g, " ") || "N/A"
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
        return "danger";
      case "PAYMENT_PENDING":
        return "secondary";
      case "PAYMENT_FAILED":
        return "danger";
      default:
        return "light";
    }
  };

  const handlePayNow = async (orderId, e) => {
    e.stopPropagation();
    setProcessingPaymentOrderId(orderId);
    setError("");
    try {
      const paymentResponse = await createMidtransTransaction(orderId);
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
      } else {
        alert(
          paymentResponse?.message ||
            "Gagal memulai pembayaran. URL redirect tidak ditemukan."
        );
      }
    } catch (err) {
      alert(err.message || "Terjadi kesalahan saat memulai pembayaran.");
      setError(err.message || "Terjadi kesalahan saat memulai pembayaran.");
    } finally {
      setProcessingPaymentOrderId(null);
    }
  };

  if (!isLoggedIn && !isLoading) {
    return <Navigate to="/login" state={{ from: "/pesanan" }} replace />;
  }

  if (isLoading) {
    return (
      <Container className="text-center py-5">
        <Spinner
          animation="border"
          style={{ width: "3rem", height: "3rem", color: "#c07722" }}
        />
        <p className="mt-3" style={{ color: "#c07722" }}>
          Memuat daftar pesanan...
        </p>
      </Container>
    );
  }

  return (
    <Container className="my-4 order-page-container">
      <h1 className="mb-4 order-page-title">Pesanan Saya</h1>
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
          <Button onClick={fetchOrders} variant="link" className="p-0 ms-2">
            Coba lagi
          </Button>
        </Alert>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <Card className="text-center shadow-sm">
          <Card.Body className="py-5">
            <BasketFill size={48} className="text-muted mb-3" />
            <Card.Title as="h4">Belum Ada Pesanan</Card.Title>
            <Card.Text className="text-muted">
              Anda belum melakukan pemesanan. Yuk, mulai belanja!
            </Card.Text>
            <Button
              as={Link}
              to="/menu"
              variant="primary"
              className="mt-3 btn-brand"
            >
              Lihat Menu
            </Button>
          </Card.Body>
        </Card>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <ListGroup>
          {orders
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .map((order) => (
              <ListGroup.Item
                key={order.orderId}
                className="mb-3 shadow-sm rounded border order-list-item"
              >
                <Row
                  className="align-items-center gy-2"
                  onClick={() => navigate(`/pesanan/${order.orderId}`)}
                  style={{ cursor: "pointer" }}
                >
                  <Col md={3} sm={12} xs={12}>
                    <strong className="d-block">Order ID:</strong>
                    <span
                      className="order-id-text"
                      style={{ wordBreak: "break-all" }}
                    >
                      #{order.orderId || "N/A"}
                    </span>
                  </Col>
                  <Col md={2} sm={6} xs={6} className="mt-2 mt-md-0">
                    <strong className="d-block">Tanggal:</strong>
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Col>
                  <Col md={2} sm={6} xs={6} className="mt-2 mt-md-0">
                    <strong className="d-block">Total:</strong>
                    Rp {order.totalPrice.toLocaleString("id-ID")}
                  </Col>
                  <Col md={2} sm={6} xs={12} className="mt-2 mt-md-0">
                    <strong className="d-block">Pembayaran:</strong>
                    {order.paymentDetails?.method
                      ? order.paymentDetails.method.replace(/_/g, " ")
                      : "N/A"}
                  </Col>
                  <Col
                    md={3}
                    sm={6}
                    xs={12}
                    className="text-md-end mt-2 mt-md-0"
                  >
                    <Badge
                      bg={getStatusBadgeVariant(order.orderStatus)}
                      pill
                      className="px-3 py-2"
                    >
                      {getDisplayOrderStatus(order.orderStatus)}
                    </Badge>
                  </Col>
                </Row>
                <Row
                  className="mt-2"
                  onClick={() => navigate(`/pesanan/${order.orderId}`)}
                  style={{ cursor: "pointer" }}
                >
                  <Col xs={12}>
                    <small className="text-muted">
                      Item:{" "}
                      {order.items && order.items.length > 0
                        ? order.items
                            .map((item) => `${item.quantity}x ${item.name}`)
                            .join(", ")
                        : "Tidak ada item"}
                    </small>
                  </Col>
                </Row>
                <div className="text-end mt-3 d-flex justify-content-end gap-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    as={Link}
                    to={`/pesanan/${order.orderId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Lihat Detail
                  </Button>
                  {order.paymentDetails?.method === "ONLINE_PAYMENT" &&
                    order.orderStatus === "AWAITING_PAYMENT" && (
                      <Button
                        variant="primary"
                        className="btn-brand"
                        size="sm"
                        onClick={(e) => handlePayNow(order.orderId, e)}
                        disabled={processingPaymentOrderId === order.orderId}
                      >
                        {processingPaymentOrderId === order.orderId ? (
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-1"
                          />
                        ) : (
                          <CreditCard className="me-1" />
                        )}
                        Bayar Sekarang
                      </Button>
                    )}
                </div>
              </ListGroup.Item>
            ))}
        </ListGroup>
      )}
    </Container>
  );
}

export default OrderPage;
