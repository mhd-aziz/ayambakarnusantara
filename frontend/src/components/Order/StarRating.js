import React from "react";
import { StarFill } from "react-bootstrap-icons";

const StarRating = ({
  rating,
  setRating,
  disabled = false,
  size = "1.5rem",
}) => {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => !disabled && setRating(star)}
          style={{
            cursor: disabled ? "default" : "pointer",
            color: star <= rating ? "#ffc107" : "#e4e5e9",
            fontSize: size,
            marginRight: "5px",
          }}
        >
          <StarFill />
        </span>
      ))}
    </div>
  );
};

export default StarRating;
