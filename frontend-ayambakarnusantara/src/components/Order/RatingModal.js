import React from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import StarRating from "./StarRating";

function RatingModal({
  show,
  onHide,
  productToRate,
  ratingValue,
  setRatingValue,
  reviewText,
  setReviewText,
  isSubmitting,
  error,
  success,
  onSubmit,
}) {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Beri Ulasan untuk {productToRate?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <Form>
          <Form.Group className="mb-3 text-center">
            <Form.Label>Rating Anda</Form.Label>
            <br />
            <StarRating rating={ratingValue} setRating={setRatingValue} />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Ulasan Anda (Opsional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Bagaimana pengalaman Anda dengan produk ini?"
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="outline-secondary"
          onClick={onHide}
          disabled={isSubmitting}
        >
          Tutup
        </Button>
        <Button
          className="btn-brand"
          onClick={onSubmit}
          disabled={isSubmitting || !ratingValue}
        >
          {isSubmitting ? (
            <>
              <Spinner as="span" size="sm" className="me-2" />
              Mengirim...
            </>
          ) : (
            "Kirim Ulasan"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default RatingModal;
