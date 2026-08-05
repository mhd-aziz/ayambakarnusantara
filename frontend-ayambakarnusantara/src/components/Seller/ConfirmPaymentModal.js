import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Alert,
  Spinner,
  Image,
  Col,
  Row,
} from "react-bootstrap";
import { Upload, CardText } from "react-bootstrap-icons";
import { confirmPaymentBySeller } from "../../services/OrderService";

function ConfirmPaymentModal({ show, onHide, order, onPaymentConfirmed }) {
  const [paymentProofs, setPaymentProofs] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!show) {
      setPaymentProofs([]);
      setImagePreviews([]);
      setConfirmationNotes("");
      setError("");
      setSuccess("");
      setIsSubmitting(false);
    }
  }, [show]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 10) {
      setError("Anda hanya dapat mengunggah maksimal 10 file.");
      setPaymentProofs([]);
      setImagePreviews([]);
      return;
    }
    setError("");
    setPaymentProofs(files);
    const previews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleSubmit = async () => {
    if (!order || !order.orderId) {
      setError("Informasi pesanan tidak valid.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    paymentProofs.forEach((file) => {
      formData.append("paymentProofs", file);
    });
    if (confirmationNotes.trim()) {
      formData.append("paymentConfirmationNotes", confirmationNotes.trim());
    }

    try {
      const response = await confirmPaymentBySeller(order.orderId, formData);
      if (response && (response.success || response.status === "success")) {
        setSuccess(response.message || "Pembayaran berhasil dikonfirmasi.");
        if (onPaymentConfirmed) {
          onPaymentConfirmed(response.data);
        }
        setTimeout(() => {
          onHide();
        }, 1500);
      } else {
        setError(response?.message || "Gagal mengonfirmasi pembayaran.");
      }
    } catch (err) {
      setError(err.message || "Terjadi kesalahan server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Konfirmasi Pembayaran & Unggah Bukti (Order #
          {order?.orderId.substring(0, 8)}...)
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError("")} dismissible>
            {error}
          </Alert>
        )}
        {success && <Alert variant="success">{success}</Alert>}

        <Form.Group controlId="paymentConfirmationNotes" className="mb-3">
          <Form.Label>
            <CardText className="me-2" />
            Catatan Konfirmasi
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={confirmationNotes}
            onChange={(e) => setConfirmationNotes(e.target.value)}
            placeholder="Contoh: Uang tunai diterima oleh Kasir A pada pukul 10:00."
            disabled={isSubmitting}
          />
        </Form.Group>

        <Form.Group controlId="paymentProofsUpload" className="mb-3">
          <Form.Label>
            <Upload className="me-2" />
            Unggah Bukti Transaksi (Maks. 10 file, @5MB)
          </Form.Label>
          <Form.Control
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            disabled={isSubmitting}
          />
        </Form.Group>

        {imagePreviews.length > 0 && (
          <div className="mt-3">
            <h6>Preview Gambar:</h6>
            <Row>
              {imagePreviews.map((preview, index) => (
                <Col key={index} xs={6} md={4} lg={3} className="mb-3">
                  <Image src={preview} thumbnail fluid />
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onHide}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          variant="primary"
          className="btn-brand"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            (!confirmationNotes.trim() && paymentProofs.length === 0)
          }
        >
          {isSubmitting ? (
            <>
              <Spinner as="span" size="sm" className="me-2" />
              Mengonfirmasi...
            </>
          ) : (
            "Konfirmasi Pembayaran"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ConfirmPaymentModal;
