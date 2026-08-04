import React from "react";
import { Star, StarFill, StarHalf } from "react-bootstrap-icons";

const StarRatingDisplay = ({ rating, size = 16 }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <div className="d-inline-block" style={{ color: "#ffc107" }}>
      {[...Array(fullStars)].map((_, i) => (
        <StarFill key={`full-${i}`} size={size} className="me-1" />
      ))}
      {halfStar && <StarHalf key="half" size={size} className="me-1" />}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty-${i}`} size={size} className="me-1" />
      ))}
    </div>
  );
};

export default StarRatingDisplay;
