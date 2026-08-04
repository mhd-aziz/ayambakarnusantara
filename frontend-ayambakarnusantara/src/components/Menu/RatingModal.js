import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Alert } from "react-bootstrap";
import StarRatingInput from "./StarRatingInput";

const RatingModal = ({
  show,
  onHide,
  onSubmit,
  isSubmitting,
  error,
  ratingToEdit,
}) => {
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    if (ratingToEdit) {
      setRatingValue(ratingToEdit.ratingValue || 0);
      setReviewText(ratingToEdit.reviewText || "");
    } else {
      setRatingValue(0);
      setReviewText("");
    }
  }, [ratingToEdit, show]);

  const handleSubmit = () => {
    onSubmit(ratingValue, reviewText);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {ratingToEdit ? "Edit Ulasan" : "Beri Ulasan"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form>
          <Form.Group className="mb-3 text-center">
            <Form.Label>Rating Anda</Form.Label>
            <br />
            <StarRatingInput
              rating={ratingValue}
              setRating={setRatingValue}
              size={28}
            />
          </Form.Group>
          <Form.Group>
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
        <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
          Batal
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting || ratingValue === 0}
        >
          {isSubmitting ? "Menyimpan..." : "Simpan"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RatingModal;
