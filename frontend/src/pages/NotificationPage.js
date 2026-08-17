import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Card,
  ListGroup,
  Spinner,
  Alert,
  Badge,
  Button,
} from "react-bootstrap";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getMyNotifications,
  markNotificationAsRead,
} from "../services/NotificationService";
import {
  Bell,
  ExclamationTriangleFill,
  ArrowClockwise,
  CheckCircleFill,
} from "react-bootstrap-icons";
import "../css/NotificationPage.css";

const timeSince = (date) => {
  if (!date) return "";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return `${Math.floor(interval)} tahun yang lalu`;
  interval = seconds / 2592000;
  if (interval > 1) return `${Math.floor(interval)} bulan yang lalu`;
  interval = seconds / 86400;
  if (interval > 1) return `${Math.floor(interval)} hari yang lalu`;
  interval = seconds / 3600;
  if (interval > 1) return `${Math.floor(interval)} jam yang lalu`;
  interval = seconds / 60;
  if (interval > 1) return `${Math.floor(interval)} menit yang lalu`;
  return `${Math.floor(seconds)} detik yang lalu`;
};

const statusTranslations = {
  PENDING_CONFIRMATION: "Menunggu Konfirmasi",
  AWAITING_PAYMENT: "Menunggu Pembayaran",
  CONFIRMED: "Dikonfirmasi",
  PROCESSING: "Sedang Diproses",
  READY_FOR_PICKUP: "Siap Diambil",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
  PAYMENT_FAILED: "Pembayaran Gagal",
};

const formatNotificationBody = (body) => {
  if (!body) return "";
  const statusRegex = new RegExp(
    Object.keys(statusTranslations).join("|"),
    "g"
  );
  return body.replace(
    statusRegex,
    (matched) => statusTranslations[matched] || matched
  );
};

function NotificationPage({ onNavigateToChat }) {
  const { user, isLoggedIn, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await getMyNotifications();
      if (response.success && Array.isArray(response.data)) {
        setNotifications(
          response.data.sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
          )
        );
      } else {
        setError(response.message || "Gagal memuat data notifikasi.");
      }
    } catch (err) {
      setError(
        err.message ||
          "Terjadi kesalahan pada server saat mengambil notifikasi."
      );
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchNotifications();
    }
  }, [isLoggedIn, fetchNotifications]);

  const handleNotificationClick = async (notification) => {
    const { notificationId, data, isRead } = notification;

    if (!isRead) {
      try {
        await markNotificationAsRead(notificationId);
        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === notificationId ? { ...n, isRead: true } : n
          )
        );
      } catch (err) {
        console.error("Gagal menandai notifikasi sebagai terbaca:", err);
      }
    }

    if (data && data.type) {
      switch (data.type) {
        case "NEW_MESSAGE":
          if (data.conversationId && typeof onNavigateToChat === "function") {
            onNavigateToChat(data.conversationId);
          }
          break;
        case "NEW_ORDER":
        case "ORDER_CANCELLED":
        case "ORDER_STATUS_UPDATE":
        case "PAYMENT_CONFIRMED":
          if (data.orderId) {
            const isNotificationForSeller =
              notification.title.includes("Pesanan Baru") ||
              notification.title.includes("Pesanan Dibatalkan");
            if (user && user.role === "seller" && isNotificationForSeller) {
              navigate("/toko-saya/pesanan");
            } else {
              navigate(`/pesanan/${data.orderId}`);
            }
          }
          break;
        default:
          console.log(
            "Tipe notifikasi tidak memiliki aksi navigasi:",
            data.type
          );
          break;
      }
    }
  };

  if (isAuthLoading) {
    return (
      <Container className="text-center py-5">
        <Spinner
          animation="border"
          style={{ color: "var(--brand-primary, #C07722)" }}
        />
      </Container>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  const renderPageContent = () => {
    if (error) {
      return (
        <Alert variant="danger" className="m-3">
          <ExclamationTriangleFill className="me-2" />
          {error}
        </Alert>
      );
    }

    if (notifications.length === 0) {
      return (
        <Card className="text-center py-5 shadow-sm empty-notifications-card">
          <Card.Body>
            <Bell size={48} className="text-muted mb-3" />
            <Card.Title as="h4">Tidak Ada Notifikasi</Card.Title>
            <Card.Text className="text-muted">
              Semua pemberitahuan penting Anda akan muncul di sini.
            </Card.Text>
          </Card.Body>
        </Card>
      );
    }

    return (
      <Card className="shadow-sm">
        <ListGroup variant="flush" className="notification-list">
          {notifications.map((notif) => (
            <ListGroup.Item
              key={notif.notificationId}
              action
              onClick={() => handleNotificationClick(notif)}
              className={`d-flex justify-content-between align-items-start p-3 ${
                !notif.isRead ? "bg-light" : ""
              }`}
            >
              <div className="d-flex align-items-center notification-content">
                <CheckCircleFill
                  size={20}
                  className={`me-3 icon-status ${
                    !notif.isRead ? "icon-unread" : "icon-read"
                  }`}
                />
                <div className="w-100">
                  <div className="notification-title">{notif.title}</div>
                  <span className="notification-body">
                    {formatNotificationBody(notif.body)}
                  </span>
                </div>
              </div>
              <div className="d-flex flex-column align-items-end ms-2">
                {!notif.isRead && (
                  <Badge bg="primary" pill className="mb-2">
                    Baru
                  </Badge>
                )}
                <small className="notification-timestamp">
                  {timeSince(notif.createdAt)}
                </small>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
    );
  };

  return (
    <div className="notification-page">
      <Container as="main" className="container-md">
        <div className="page-header d-flex justify-content-between align-items-center mb-4">
          <h1 className="page-title mb-0">Notifikasi</h1>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={fetchNotifications}
            disabled={loading}
            className="d-flex align-items-center"
          >
            {loading ? (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                className="me-2"
              />
            ) : (
              <ArrowClockwise size={16} className="me-2" />
            )}
            <span>{loading ? "Memuat..." : "Refresh"}</span>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner
              animation="border"
              style={{
                width: "3rem",
                height: "3rem",
                color: "var(--brand-primary, #C07722)",
              }}
            />
            <p
              className="mt-3"
              style={{ color: "var(--brand-primary, #C07722)" }}
            >
              Memuat notifikasi...
            </p>
          </div>
        ) : (
          renderPageContent()
        )}
      </Container>
    </div>
  );
}

export default NotificationPage;
