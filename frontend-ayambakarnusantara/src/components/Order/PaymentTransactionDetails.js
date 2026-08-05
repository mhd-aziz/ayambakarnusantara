import React from "react";
import { Row, Col, ListGroup } from "react-bootstrap";
import { Receipt } from "react-bootstrap-icons";

const ICON_COLOR = "#C07722";

function PaymentTransactionDetails({
  details,
  getDisplayPaymentGatewayStatus,
}) {
  if (!details?.paymentGatewayStatus) return null;

  const { paymentGatewayStatus } = details;

  return (
    <>
      <ListGroup.Item>
        <strong className="text-muted">Detail Transaksi:</strong>
      </ListGroup.Item>
      <ListGroup.Item>
        <Row>
          <Col sm={4}>
            <strong>
              <Receipt color={ICON_COLOR} className="me-2" />
              ID Transaksi:
            </strong>
          </Col>
          <Col sm={8} style={{ wordBreak: "break-all" }}>
            {paymentGatewayStatus.transaction_id || "Tidak Ada"}
          </Col>
        </Row>
      </ListGroup.Item>
      <ListGroup.Item>
        <Row>
          <Col sm={4}>
            <strong>Status Transaksi:</strong>
          </Col>
          <Col sm={8}>
            {getDisplayPaymentGatewayStatus(
              paymentGatewayStatus.transaction_status
            )}
          </Col>
        </Row>
      </ListGroup.Item>
      {paymentGatewayStatus.payment_type && (
        <ListGroup.Item>
          <Row>
            <Col sm={4}>
              <strong>Tipe Pembayaran:</strong>
            </Col>
            <Col sm={8}>
              {paymentGatewayStatus.payment_type
                .replace(/_/g, " ")
                .toUpperCase() || "Tidak Ada"}
            </Col>
          </Row>
        </ListGroup.Item>
      )}
      {paymentGatewayStatus.va_numbers?.length > 0 && (
        <ListGroup.Item>
          <Row>
            <Col sm={4}>
              <strong>Nomor VA:</strong>
            </Col>
            <Col sm={8}>
              {paymentGatewayStatus.va_numbers
                .map((va) => `${va.bank.toUpperCase()}: ${va.va_number}`)
                .join(", ")}
            </Col>
          </Row>
        </ListGroup.Item>
      )}
      {paymentGatewayStatus.expiry_time && (
        <ListGroup.Item>
          <Row>
            <Col sm={4}>
              <strong>Waktu Kadaluarsa:</strong>
            </Col>
            <Col sm={8}>
              {new Date(paymentGatewayStatus.expiry_time).toLocaleString(
                "id-ID",
                {
                  dateStyle: "long",
                  timeStyle: "short",
                }
              )}
            </Col>
          </Row>
        </ListGroup.Item>
      )}
      {paymentGatewayStatus.settlement_time && (
        <ListGroup.Item>
          <Row>
            <Col sm={4}>
              <strong>Waktu Penyelesaian:</strong>
            </Col>
            <Col sm={8}>
              {new Date(paymentGatewayStatus.settlement_time).toLocaleString(
                "id-ID",
                {
                  dateStyle: "long",
                  timeStyle: "short",
                }
              )}
            </Col>
          </Row>
        </ListGroup.Item>
      )}
    </>
  );
}

export default PaymentTransactionDetails;
