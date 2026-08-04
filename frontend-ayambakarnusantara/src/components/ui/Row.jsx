import React from "react";

function Row({ className = "", children, ...rest }) {
  const g0 = String(className).includes("g-0") || String(className).includes("gx-0");
  const classes = g0
    ? "flex flex-wrap"
    : "flex flex-wrap -mx-3";
  return (
    <div className={`${classes} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export default Row;
