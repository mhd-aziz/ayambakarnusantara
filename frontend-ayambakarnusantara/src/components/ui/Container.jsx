import React from "react";

const MAX_WIDTHS = {
  sm: "max-w-[540px]",
  md: "max-w-[720px]",
  lg: "max-w-[960px]",
  xl: "max-w-[1140px]",
  xxl: "max-w-[1320px]",
};

function Container({ fluid = false, className = "", children, ...rest }) {
  const classes = fluid
    ? "w-full"
    : `w-full mx-auto px-3 sm:${MAX_WIDTHS.sm} md:${MAX_WIDTHS.md} lg:${MAX_WIDTHS.lg} xl:${MAX_WIDTHS.xl} 2xl:${MAX_WIDTHS.xxl}`;
  return (
    <div className={`${classes} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export default Container;