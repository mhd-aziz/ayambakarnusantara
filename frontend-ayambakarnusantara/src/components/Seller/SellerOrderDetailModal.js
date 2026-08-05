import React from "react";
import {
  Modal,
  Button,
  Spinner,
  Alert,
  Row,
  Col,
  ListGroup,
  Badge,
} from "react-bootstrap";

function SellerOrderDetailModal({
  show,
  onHide,
  orderData,
  isLoading,
  error,
  getStatusBadgeVariant,
}) {
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

  const paymentStatusInfo = orderData?.order
    ? getPaymentStatusInfo(orderData.order.paymentDetails)
    : { text: "N/A", variant: "secondary" };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          Detail Pesanan #
          {orderData?.order?.orderId
            ? orderData.order.orderId.substring(0, 8)
            : "..."}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading && (
          <div className="text-center">
            <Spinner
              animation="border"
              style={{ color: "var(--brand-primary)" }}
            />
            <p className="mt-2">Memuat detail...</p>
          </div>
        )}
        {error && <Alert variant="danger">{error}</Alert>}
        {orderData && !isLoading && !error && (
          <>
            <Row>
              <Col md={6}>
                <h5>Informasi Pesanan</h5>
                <ListGroup variant="flush">
                  <ListGroup.Item>
                    <strong>ID Pesanan:</strong> {orderData.order.orderId}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>Tanggal:</strong>{" "}
                    {new Date(orderData.order.createdAt).toLocaleString(
                      "id-ID",
                      { dateStyle: "full", timeStyle: "long" }
                    )}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>Status:</strong>{" "}
                    <Badge
                      bg={getStatusBadgeVariant(orderData.order.orderStatus)}
                    >
                      {formatOrderStatus(orderData.order.orderStatus)}
                    </Badge>
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>Total:</strong> Rp{" "}
                    {orderData.order.totalPrice.toLocaleString("id-ID")}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>Metode Pembayaran:</strong>{" "}
                    {formatPaymentMethod(
                      orderData.order.paymentDetails?.method
                    )}
                  </ListGroup.Item>
                  <ListGroup.Item>
                    <strong>Status Pembayaran:</strong>{" "}
                    <Badge bg={paymentStatusInfo.variant}>
                      {paymentStatusInfo.text}
                    </Badge>
                  </ListGroup.Item>
                  {orderData.order.notes && (
                    <ListGroup.Item>
                      <strong>Catatan Pelanggan:</strong>{" "}
                      {orderData.order.notes}
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </Col>
              <Col md={6}>
                <h5>Informasi Pelanggan</h5>
                {orderData.customerDetails ? (
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Nama:</strong>{" "}
                      {orderData.customerDetails.displayName || "N/A"}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Email:</strong>{" "}
                      {orderData.customerDetails.email || "N/A"}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Telepon:</strong>{" "}
                      {orderData.customerDetails.phoneNumber || "N/A"}
                    </ListGroup.Item>
                  </ListGroup>
                ) : (
                  <p>Detail pelanggan tidak tersedia.</p>
                )}
              </Col>
            </Row>
            <h5 className="mt-4">Item Pesanan</h5>
            <ListGroup>
              {orderData.order.items.map((item, index) => (
                <ListGroup.Item key={index}>
                  <Row>
                    <Col xs={2} sm={1}>
                      <img
                        src={
                          item.productImageURL ||
                          `https://placehold.co/50x50/EFEFEF/AAAAAA?text=${encodeURIComponent(
                            item.name[0]
                          )}`
                        }
                        alt={item.name}
                        className="img-fluid rounded"
                        style={{
                          maxWidth: "50px",
                          maxHeight: "50px",
                          objectFit: "cover",
                        }}
                      />
                    </Col>
                    <Col>
                      <strong>{item.name}</strong> <br />
                      <small className="text-muted">
                        {item.quantity} x Rp{" "}
                        {item.price.toLocaleString("id-ID")}
                      </small>
                    </Col>
                    <Col xs={3} className="text-end">
                      Rp {item.subtotal.toLocaleString("id-ID")}
                    </Col>
                  </Row>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Tutup
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default SellerOrderDetailModal;
