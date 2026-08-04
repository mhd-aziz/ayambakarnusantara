import React from "react";
import { ListGroup, Row, Col, Badge, Button } from "react-bootstrap";
import {
  EyeFill,
  PencilSquare,
  CardChecklist,
  ImageFill,
} from "react-bootstrap-icons";
import "../../css/SellerOrderList.css";

function SellerOrderList({
  orders,
  onShowDetailModal,
  onShowUpdateStatusModal,
  onShowConfirmPaymentModal,
  onShowViewProofsModal,
  getStatusBadgeVariant,
  getAvailableNextStatuses,
}) {
  if (!orders || orders.length === 0) {
    return null;
  }

  const getPaymentStatusInfo = (paymentDetails) => {
    const statusMap = {
      paid: { text: "Lunas", variant: "success" },
      pay_on_pickup: { text: "Belum Lunas", variant: "warning" },
      awaiting_gateway_interaction: {
        text: "Menunggu Pembayaran",
        variant: "warning",
      },
      pending_gateway_payment: {
        text: "Proses Pembayaran",
        variant: "warning",
      },
      cancelled_by_user: { text: "Dibatalkan", variant: "secondary" },
    };

    const statusInfo = statusMap[paymentDetails?.status];
    if (statusInfo) {
      return statusInfo;
    }

    return {
      text: paymentDetails?.status?.replace(/_/g, " ") || "N/A",
      variant: "secondary",
    };
  };

  const formatOrderStatus = (status) => {
    const statusMap = {
      PENDING_CONFIRMATION: "Menunggu Konfirmasi",
      AWAITING_PAYMENT: "Menunggu Pembayaran",
      CONFIRMED: "Dikonfirmasi",
      PROCESSING: "Sedang Diproses",
      READY_FOR_PICKUP: "Siap Diambil",
      COMPLETED: "Selesai",
      CANCELLED: "Dibatalkan",
    };
    return statusMap[status] || status.replace(/_/g, " ");
  };

  const formatPaymentMethod = (method) => {
    const methodMap = {
      PAY_AT_STORE: "Bayar di Toko",
      ONLINE_PAYMENT: "Pembayaran Online",
    };
    return methodMap[method] || method?.replace(/_/g, " ") || "N/A";
  };

  return (
    <ListGroup className="order-list-group">
      {orders
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((order) => {
          const paymentStatusInfo = getPaymentStatusInfo(order.paymentDetails);

          return (
            <ListGroup.Item
              key={order.orderId}
              className="mb-3 shadow-sm rounded border order-list-item"
            >
              <Row className="align-items-center gy-3">
                <Col lg={2} md={4} sm={6}>
                  <strong className="d-block">Order ID:</strong>
                  <span
                    className="text-muted order-id-text"
                    title={order.orderId}
                  >
                    #{order.orderId.substring(0, 10)}...
                  </span>
                </Col>
                <Col lg={2} md={4} sm={6}>
                  <strong className="d-block">Metode:</strong>
                  {formatPaymentMethod(order.paymentDetails?.method)}
                </Col>
                <Col lg={2} md={4} sm={6}>
                  <strong className="d-block">Pembayaran:</strong>
                  <Badge
                    bg={paymentStatusInfo.variant}
                    className="payment-status-badge"
                  >
                    {paymentStatusInfo.text}
                  </Badge>
                </Col>
                <Col lg={2} md={4} sm={6}>
                  <strong className="d-block">Status Pesanan:</strong>
                  <Badge
                    bg={getStatusBadgeVariant(order.orderStatus)}
                    className="order-status-badge"
                  >
                    {formatOrderStatus(order.orderStatus)}
                  </Badge>
                </Col>
                <Col lg={2} md={4} sm={6}>
                  <strong className="d-block">Total:</strong>
                  Rp {order.totalPrice.toLocaleString("id-ID")}
                </Col>
                <Col
                  lg={2}
                  md={4}
                  sm={6}
                  className="text-md-end order-actions d-flex flex-wrap justify-content-start justify-content-sm-end gap-1"
                >
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="action-button"
                    onClick={() => onShowDetailModal(order.orderId)}
                    title="Lihat Detail Pesanan"
                  >
                    <EyeFill />
                  </Button>
                  {getAvailableNextStatuses(order.orderStatus).length > 0 &&
                    order.orderStatus !== "AWAITING_PAYMENT" && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="action-button"
                        onClick={() => onShowUpdateStatusModal(order)}
                        title="Update Status Pesanan"
                      >
                        <PencilSquare />
                      </Button>
                    )}
                  {order.paymentDetails?.method === "PAY_AT_STORE" &&
                    order.paymentDetails?.status !== "paid" &&
                    order.orderStatus !== "CANCELLED" && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        className="action-button"
                        onClick={() => onShowConfirmPaymentModal(order)}
                        title="Konfirmasi Pembayaran (COD)"
                      >
                        <CardChecklist />
                      </Button>
                    )}
                  {(order.paymentDetails?.proofImageURLs?.length > 0 ||
                    order.paymentDetails?.confirmationNotes) && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="action-button"
                      onClick={() => onShowViewProofsModal(order.orderId)}
                      title="Lihat Bukti Pembayaran"
                    >
                      <ImageFill />
                    </Button>
                  )}
                </Col>
              </Row>
              <Row className="mt-2">
                <Col xs={12}>
                  <small className="text-muted">
                    {order.items?.length || 0} item
                    {order.items?.length !== 1 ? "s" : ""}
                    {order.items && order.items.length > 0 && (
                      <>
                        :{" "}
                        {order.items
                          .map((item) => `${item.quantity}x ${item.name}`)
                          .join(", ")
                          .substring(0, 100)}
                        {order.items
                          .map((item) => `${item.quantity}x ${item.name}`)
                          .join(", ").length > 100 && "..."}
                      </>
                    )}
                  </small>
                </Col>
              </Row>
            </ListGroup.Item>
          );
        })}
    </ListGroup>
  );
}

export default SellerOrderList;
