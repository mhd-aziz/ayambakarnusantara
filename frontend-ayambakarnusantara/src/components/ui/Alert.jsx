import React from "react";
import Button from "./Button";

const VARIANTS = {
  primary: "bg-[#cfe2ff] border-[#b6d4fe] text-[#084298]",
  secondary: "bg-[#e2e3e5] border-[#d3d6d8] text-[#41464b]",
  success: "bg-[#d1e7dd] border-[#badbcc] text-[#0f5132]",
  danger: "bg-[#f8d7da] border-[#f5c2c7] text-[#842029]",
  warning: "bg-[#fff3cd] border-[#ffecb5] text-[#664d03]",
  info: "bg-[#cff4fc] border-[#b6effb] text-[#055160]",
  light: "bg-[#fefefe] border-[#fdfdfe] text-[#636464]",
  dark: "bg-[#d3d3d4] border-[#c3c4c5] text-[#141619]",
};

function Alert({
  variant = "primary",
  dismissible = false,
  onClose,
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "relative rounded-[0.375rem] border px-4 py-[1rem] mb-[1rem]",
    VARIANTS[variant] || VARIANTS.primary,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes} role="alert" {...rest}>
      {children}
      {dismissible && (
        <Button
          variant="link"
          onClick={onClose}
          aria-label="Close"
          className="!absolute top-0 right-0 z-[2] p-[1rem] text-[inherit] underline hover:text-[inherit] focus-visible:ring-[rgba(0,0,0,0.25)]"
        >
          <span aria-hidden="true">&times;</span>
        </Button>
      )}
    </div>
  );
}

const Heading = ({ as: Tag = "h4", className = "", children, ...rest }) => (
  <Tag className={`mb-1 font-medium ${className}`} {...rest}>
    {children}
  </Tag>
);

Alert.Heading = Heading;

export default Alert;