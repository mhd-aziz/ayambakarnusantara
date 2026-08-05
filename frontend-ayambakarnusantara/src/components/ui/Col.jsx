import React from "react";

const SPAN_MAP = {
  1: "w-1/12",
  2: "w-1/6",
  3: "w-1/4",
  4: "w-1/3",
  5: "w-5/12",
  6: "w-1/2",
  7: "w-7/12",
  8: "w-2/3",
  9: "w-3/4",
  10: "w-5/6",
  11: "w-11/12",
  12: "w-full",
};

function colClasses(size, value) {
  if (value === undefined || value === null || value === false) return "";
  const bp = size === "xs" ? "" : `${size}:`;
  if (value === true || value === "auto") {
    return `${bp}flex-none ${bp}w-auto`;
  }
  if (typeof value === "object") {
    const span = SPAN_MAP[value.span] ? `${bp}${SPAN_MAP[value.span]}` : "";
    const order = value.order ? `${bp}order-${value.order}` : "";
    const offset = value.offset ? `${bp}ml-[${(value.offset / 12) * 100}%]` : "";
    return [span, order, offset].filter(Boolean).join(" ");
  }
  const span = SPAN_MAP[value] ? SPAN_MAP[value] : "";
  return span ? `${bp}${span}` : `${bp}flex-none ${bp}w-auto`;
}

function Col({ xs, sm, md, lg, xl, xxl, className = "", children, ...rest }) {
  const base = "px-3";
  // Default react-bootstrap <Col> tanpa props = flex: 1 0 0%
  const hasSpan = [xs, sm, md, lg, xl, xxl].some((v) => v !== undefined && v !== null && v !== false);
  const flexDefault = hasSpan ? "flex-none" : "flex-[1_0_0%]";
  const classes = [
    base,
    flexDefault,
    colClasses("xs", xs),
    colClasses("sm", sm),
    colClasses("md", md),
    colClasses("lg", lg),
    colClasses("xl", xl),
    colClasses("2xl", xxl),
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

export default Col;