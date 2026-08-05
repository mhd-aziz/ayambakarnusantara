import React from "react";
import { Row, Col, Image, Spinner, Alert, Button, Card } from "react-bootstrap";
import { PencilFill, TrashFill } from "react-bootstrap-icons";
import StarRatingDisplay from "./StarRatingDisplay";
import "../../css/ProductRatings.css";

const ProductRatings = ({
  ratingsData,
  isLoading,
  error,
  currentUser,
  onEdit,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="text-center">
        <Spinner animation="border" size="sm" /> Memuat ulasan...
      </div>
    );
  }

  if (error) {
    return <Alert variant="warning">Tidak dapat memuat ulasan saat ini.</Alert>;
  }

  if (
    !ratingsData ||
    !ratingsData.ratings ||
    ratingsData.ratings.length === 0
  ) {
    return <p className="text-muted">Belum ada ulasan untuk produk ini.</p>;
  }

  return (
    <Row>
      {ratingsData.ratings.map((rating) => (
        <Col
          md={6}
          key={rating.ratingId}
          className="mb-4 d-flex align-items-stretch"
        >
          <Card className="review-card w-100" bg="white">
            <Card.Body className="d-flex flex-column">
              <div className="d-flex align-items-start mb-3">
                <Image
                  src={
                    rating.userPhotoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      rating.userDisplayName || "U"
                    )}&background=C07722&color=fff&size=45`
                  }
                  roundedCircle
                  width="45"
                  height="45"
                  className="me-3"
                />
                <div className="flex-grow-1">
                  <strong className="review-author-name d-block">
                    {rating.userDisplayName}
                  </strong>
                  <small className="review-date">
                    {new Date(rating.createdAt).toLocaleDateString("id-ID")}
                  </small>
                </div>
              </div>

              <div className="mb-3">
                <StarRatingDisplay rating={rating.ratingValue} size={16} />
              </div>

              <p className="review-text mb-0 flex-grow-1">
                {rating.reviewText || "Tidak ada ulasan teks."}
              </p>

              {currentUser?.uid === rating.userId && (
                <div className="mt-3 text-end border-top pt-2">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="me-2"
                    onClick={() => onEdit(rating)}
                  >
                    <PencilFill />
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => onDelete(rating.ratingId)}
                  >
                    <TrashFill />
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default ProductRatings;
