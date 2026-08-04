import React from "react";
import { Modal, Button, Spinner } from "react-bootstrap";

const DeleteRatingModal = ({ show, onHide, onConfirm, isDeleting }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Konfirmasi Hapus</Modal.Title>
      </Modal.Header>
      <Modal.Body>Anda yakin ingin menghapus ulasan ini?</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Tidak
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? (
            <>
              <Spinner as="span" size="sm" className="me-2" />
              Menghapus...
            </>
          ) : (
            "Ya, Hapus"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeleteRatingModal;
