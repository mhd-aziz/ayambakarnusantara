import React from "react";
import { Star, StarFill } from "react-bootstrap-icons";

const StarRatingInput = ({ rating, setRating, size = 24 }) => {
  return (
    <div
      className="d-inline-block"
      style={{ color: "#ffc107", cursor: "pointer" }}
    >
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        return (
          <span
            key={starValue}
            onClick={() => setRating(starValue)}
            style={{ marginRight: "5px" }}
          >
            {starValue <= rating ? (
              <StarFill size={size} />
            ) : (
              <Star size={size} />
            )}
          </span>
        );
      })}
    </div>
  );
};

export default StarRatingInput;
