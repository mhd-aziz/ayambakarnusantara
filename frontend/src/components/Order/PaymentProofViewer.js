import React, { useState } from "react";
import {
  Card,
  Button,
  Modal,
  Spinner,
  Alert,
  Image,
  Row,
  Col,
} from "react-bootstrap";
import { Receipt } from "react-bootstrap-icons";
import { getOrderPaymentProofs } from "../../services/OrderService";

const ICON_COLOR = "#C07722";

function PaymentProofViewer({ orderId, paymentDetails }) {
  const [showModal, setShowModal] = useState(false);
  const [proofsData, setProofsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Komponen ini hanya akan dirender jika metode pembayaran adalah PAY_AT_STORE dan statusnya sudah lunas.
  if (
    paymentDetails?.method !== "PAY_AT_STORE" ||
    paymentDetails?.status !== "paid"
  ) {
    return null;
  }

  const handleFetchProofs = async () => {
    if (!orderId) {
      setError("ID Pesanan tidak valid untuk mengambil bukti.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await getOrderPaymentProofs(orderId);
      if (response?.success && response.data) {
        setProofsData(response.data);
      } else {
        setError(response?.message || "Gagal memuat bukti pembayaran.");
        setProofsData(null);
      }
    } catch (err) {
      setError(
        err.message || "Terjadi kesalahan pada server saat mengambil bukti."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowModal = () => {
    setShowModal(true);
    // Panggil API saat modal dibuka
    handleFetchProofs();
  };

  const handleHideModal = () => {
    setShowModal(false);
    // Reset state saat modal ditutup
    setProofsData(null);
    setError("");
  };

  return (
    <>
      <Card className="shadow-sm mb-4">
        <Card.Header as="h5">
          {/* PERBAIKAN: Menggunakan ikon Receipt */}
          <Receipt color={ICON_COLOR} className="me-2" />
          Bukti Pembayaran
        </Card.Header>
        <Card.Body>
          <p className="small text-muted">
            Pembayaran untuk pesanan ini telah dikonfirmasi oleh penjual. Anda
            dapat melihat catatan atau bukti yang diunggah.
          </p>
          <Button
            variant="outline-primary"
            className="w-100 btn-brand"
            onClick={handleShowModal}
          >
            Lihat Bukti Pembayaran
          </Button>
        </Card.Body>
      </Card>

      <Modal
        show={showModal}
        onHide={handleHideModal}
        size="lg"
        centered
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>
            Bukti & Catatan Pembayaran (Order #{orderId?.substring(0, 8)}...)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {isLoading && (
            <div className="text-center">
              <Spinner animation="border" />
              <p>Memuat bukti...</p>
            </div>
          )}
          {error && <Alert variant="danger">{error}</Alert>}

          {!isLoading && !error && !proofsData && (
            <Alert variant="info">
              Tidak ada data bukti pembayaran untuk ditampilkan.
            </Alert>
          )}

          {proofsData && (
            <>
              {proofsData.confirmationNotes && (
                <Card className="mb-3">
                  <Card.Header as="h6">Catatan dari Penjual</Card.Header>
                  <Card.Body>
                    <blockquote className="blockquote mb-0">
                      <p className="small fst-italic">
                        "{proofsData.confirmationNotes}"
                      </p>
                    </blockquote>
                  </Card.Body>
                </Card>
              )}

              {proofsData.proofImageURLs &&
              proofsData.proofImageURLs.length > 0 ? (
                <>
                  <h6>Bukti Gambar:</h6>
                  <Row>
                    {proofsData.proofImageURLs.map((url, index) => (
                      <Col key={index} xs={12} sm={6} md={4} className="mb-3">
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Image
                            src={url}
                            thumbnail
                            fluid
                            alt={`Bukti ${index + 1}`}
                          />
                        </a>
                      </Col>
                    ))}
                  </Row>
                </>
              ) : (
                !proofsData.confirmationNotes && (
                  <p className="text-muted">
                    Tidak ada bukti gambar yang diunggah oleh penjual.
                  </p>
                )
              )}

              {!proofsData.confirmationNotes &&
                (!proofsData.proofImageURLs ||
                  proofsData.proofImageURLs.length === 0) && (
                  <Alert variant="info">
                    Penjual tidak menyertakan catatan atau bukti gambar saat
                    mengonfirmasi pembayaran.
                  </Alert>
                )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleHideModal}>
            Tutup
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PaymentProofViewer;
