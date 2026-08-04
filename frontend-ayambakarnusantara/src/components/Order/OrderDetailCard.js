import React from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  ListGroup,
  Row,
  Spinner,
} from "react-bootstrap";
import {
  ArrowClockwise,
  BoxSeam,
  CalendarCheck,
  CreditCardFill,
  Hash,
  PersonCircle,
  XCircleFill,
} from "react-bootstrap-icons";
import PaymentTransactionDetails from "./PaymentTransactionDetails";

const ICON_COLOR = "#C07722";

function OrderDetailCard({
  orderDetails,
  user,
  getDisplayOrderStatus,
  getStatusBadgeVariant,
  getDisplayPaymentStatus,
  paymentTransactionDetails,
  getDisplayPaymentGatewayStatus,
  isActionInProgress,
  canCancelOrder,
  showPayNowButton,
  showCheckStatusButton,
  onCancel,
  onPay,
  onCheckStatus,
}) {
  return (
    <Card className="shadow-sm mb-4">
      <Card.Header
        as="h5"
        className="d-flex justify-content-between align-items-center"
      >
        Detail Pesanan
        <Badge bg={getStatusBadgeVariant(orderDetails.orderStatus)} pill>
          {getDisplayOrderStatus(orderDetails.orderStatus)}
        </Badge>
      </Card.Header>
      <Card.Body>
        <ListGroup variant="flush">
          {/* Order Info */}
          <ListGroup.Item>
            <Row>
              <Col sm={4}>
                <strong>
                  <Hash color={ICON_COLOR} className="me-2" />
                  ID Pesanan:
                </strong>
              </Col>
              <Col sm={8} style={{ wordBreak: "break-all" }}>
                {orderDetails.orderId || "Tidak Ada"}
              </Col>
            </Row>
          </ListGroup.Item>
          <ListGroup.Item>
            <Row>
              <Col sm={4}>
                <strong>
                  <CalendarCheck color={ICON_COLOR} className="me-2" />
                  Tanggal Pesan:
                </strong>
              </Col>
              <Col sm={8}>
                {orderDetails.createdAt
                  ? new Date(orderDetails.createdAt).toLocaleString("id-ID", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })
                  : "Tidak Ada"}
              </Col>
            </Row>
          </ListGroup.Item>
          <ListGroup.Item>
            <Row>
              <Col sm={4}>
                <strong>
                  <PersonCircle color={ICON_COLOR} className="me-2" />
                  Nama Pemesan:
                </strong>
              </Col>
              <Col sm={8}>
                {user?.displayName || orderDetails.userId || "Tidak Ada"}
              </Col>
            </Row>
          </ListGroup.Item>
          <ListGroup.Item>
            <Row>
              <Col sm={4}>
                <strong>
                  <CreditCardFill color={ICON_COLOR} className="me-2" />
                  Metode Pembayaran:
                </strong>
              </Col>
              <Col sm={8}>
                {orderDetails.paymentDetails?.method
                  ? orderDetails.paymentDetails.method.replace(/_/g, " ")
                  : "Tidak Ada"}
                <Badge
                  bg={
                    orderDetails.paymentDetails?.status === "paid" ||
                    orderDetails.paymentDetails?.status === "pay_on_pickup"
                      ? "success"
                      : "warning"
                  }
                  className="ms-2"
                >
                  {getDisplayPaymentStatus(
                    orderDetails.paymentDetails?.status
                  ) ||
                    (orderDetails.orderStatus === "AWAITING_PAYMENT"
                      ? "Menunggu Pembayaran"
                      : "")}
                </Badge>
              </Col>
            </Row>
          </ListGroup.Item>

          {/* Payment Details */}
          {paymentTransactionDetails && (
            <PaymentTransactionDetails
              details={paymentTransactionDetails}
              getDisplayPaymentGatewayStatus={getDisplayPaymentGatewayStatus}
            />
          )}

          <ListGroup.Item>
            <Row>
              <Col sm={4}>
                <strong>
                  <BoxSeam color={ICON_COLOR} className="me-2" />
                  Jenis Pesanan:
                </strong>
              </Col>
              <Col sm={8}>{orderDetails.orderType || "Tidak Ada"}</Col>
            </Row>
          </ListGroup.Item>
          {orderDetails.notes && (
            <ListGroup.Item>
              <Row>
                <Col sm={4}>
                  <strong>Catatan:</strong>
                </Col>
                <Col sm={8}>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      margin: 0,
                      fontFamily: "inherit",
                    }}
                  >
                    {orderDetails.notes}
                  </pre>
                </Col>
              </Row>
            </ListGroup.Item>
          )}
          <ListGroup.Item>
            <Row>
              <Col sm={4}>
                <strong>Total Pembayaran:</strong>
              </Col>
              <Col sm={8} className="fw-bold fs-5 text-primary">
                Rp {orderDetails.totalPrice?.toLocaleString("id-ID") || "0"}
              </Col>
            </Row>
          </ListGroup.Item>
        </ListGroup>
      </Card.Body>
      <Card.Footer className="text-end d-flex justify-content-end flex-wrap gap-2">
        {canCancelOrder && (
          <Button
            variant="danger"
            onClick={onCancel}
            disabled={isActionInProgress}
          >
            <XCircleFill className="me-2" /> Batalkan Pesanan
          </Button>
        )}
        {showPayNowButton && (
          <Button
            variant="success"
            onClick={onPay}
            disabled={isActionInProgress}
          >
            {isActionInProgress ? (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                className="me-2"
              />
            ) : (
              <CreditCardFill className="me-2" />
            )}
            Bayar Sekarang
          </Button>
        )}
        {showCheckStatusButton && (
          <Button
            variant="info"
            onClick={onCheckStatus}
            disabled={isActionInProgress}
          >
            {isActionInProgress ? (
              <Spinner
                as="span"
                animation="border"
                size="sm"
                className="me-2"
              />
            ) : (
              <ArrowClockwise className="me-2" />
            )}
            Cek Status
          </Button>
        )}
      </Card.Footer>
    </Card>
  );
}

export default OrderDetailCard;
