import React from "react";
import { Modal, Button, Spinner, Alert } from "react-bootstrap";
import { ExclamationTriangleFill } from "react-bootstrap-icons";

function CancelOrderModal({ show, onHide, onConfirm, isCancelling, error }) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="modal-header-danger">
        <Modal.Title>
          <ExclamationTriangleFill className="me-2" /> Konfirmasi Pembatalan
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        Anda yakin ingin membatalkan pesanan ini? Tindakan ini mungkin tidak
        dapat diurungkan.
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isCancelling}>
          Tidak
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isCancelling}>
          {isCancelling ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                className="me-2"
              />
              Membatalkan...
            </>
          ) : (
            "Ya, Batalkan Pesanan"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default CancelOrderModal;
