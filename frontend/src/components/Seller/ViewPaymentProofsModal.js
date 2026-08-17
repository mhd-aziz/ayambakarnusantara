import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Spinner,
  Alert,
  Image,
  Card,
  Col,
  Row,
} from "react-bootstrap";
import { getOrderPaymentProofs } from "../../services/OrderService";

function ViewPaymentProofsModal({ show, onHide, orderId }) {
  const [proofsData, setProofsData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (show && orderId) {
      setIsLoading(true);
      setError("");
      setProofsData(null);
      getOrderPaymentProofs(orderId)
        .then((response) => {
          if (
            response &&
            (response.success || response.status === "success") &&
            response.data
          ) {
            setProofsData(response.data);
          } else {
            setError(response?.message || "Gagal mengambil bukti pembayaran.");
          }
        })
        .catch((err) => {
          setError(err.message || "Terjadi kesalahan server.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [show, orderId]);

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          Bukti & Catatan Pembayaran (Order #{orderId?.substring(0, 8)})
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading && (
          <div className="text-center py-5">
            <Spinner
              animation="border"
              style={{ color: "var(--brand-primary)" }}
            />
            <p className="mt-2 text-muted">Memuat bukti...</p>
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
                <Card.Header as="h6">Catatan Konfirmasi</Card.Header>
                <Card.Body>
                  <p>{proofsData.confirmationNotes}</p>
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
                <p>Tidak ada bukti gambar yang diunggah.</p>
              )
            )}
            {!proofsData.confirmationNotes &&
              (!proofsData.proofImageURLs ||
                proofsData.proofImageURLs.length === 0) && (
                <Alert variant="info">
                  Belum ada catatan atau bukti pembayaran yang diunggah untuk
                  pesanan ini.
                </Alert>
              )}
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

export default ViewPaymentProofsModal;
