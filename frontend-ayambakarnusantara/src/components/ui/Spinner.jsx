import React from "react";

const COLORS = {
  primary: "text-primary",
  secondary: "text-secondary",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
  light: "text-light",
  dark: "text-dark",
};

function Spinner({
  animation = "border",
  variant = "primary",
  size,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}) {
  const color = COLORS[variant] || "text-primary";
  if (animation === "grow") {
    const grow = size === "sm" ? "w-4 h-4" : "w-8 h-8";
    return (
      <Tag
        role="status"
        className={`inline-block align-middle rounded-full bg-current animate-[spinner-grow_0.75s_linear_infinite] ${grow} ${color} ${className}`}
        {...rest}
      >
        {children}
      </Tag>
    );
  }
  const border = size === "sm" ? "w-4 h-4 border-2" : "w-8 h-8 border-4";
  return (
    <Tag
      role="status"
      className={`inline-block align-middle rounded-full border-current border-solid border-t-transparent animate-spin ${border} ${color} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Spinner;
