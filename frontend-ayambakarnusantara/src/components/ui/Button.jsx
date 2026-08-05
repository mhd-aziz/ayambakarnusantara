import React from "react";

const VARIANTS = {
  primary:
    "bg-primary border-primary text-white hover:bg-[#a56317] hover:border-[#a56317] active:bg-[#a56317] active:border-[#944e0d] focus-visible:ring-[rgba(192,119,34,0.5)]",
  secondary:
    "bg-secondary border-secondary text-white hover:bg-[#5c636a] hover:border-[#565e64] active:bg-[#565e64] active:border-[#51585e] focus-visible:ring-[rgba(130,138,145,0.5)]",
  success:
    "bg-success border-success text-white hover:bg-[#157347] hover:border-[#146c43] active:bg-[#146c43] active:border-[#13653f] focus-visible:ring-[rgba(60,153,110,0.5)]",
  danger:
    "bg-danger border-danger text-white hover:bg-[#bb2d3b] hover:border-[#b02a37] active:bg-[#b02a37] active:border-[#a52834] focus-visible:ring-[rgba(225,83,97,0.5)]",
  warning:
    "bg-warning border-warning text-black hover:bg-[#ffca2c] hover:border-[#ffc720] active:bg-[#ffcd39] active:border-[#ffc720] focus-visible:ring-[rgba(217,164,6,0.5)]",
  info: "bg-info border-info text-black hover:bg-[#31d2f2] hover:border-[#25cff2] active:bg-[#3dd5f3] active:border-[#25cff2] focus-visible:ring-[rgba(11,172,204,0.5)]",
  light:
    "bg-light border-light text-black hover:bg-[#f9fafb] hover:border-[#f9fafb] active:bg-[#f9fafb] active:border-[#f9fafb] focus-visible:ring-[rgba(211,212,213,0.5)]",
  dark: "bg-dark border-dark text-white hover:bg-[#424649] hover:border-[#373b3e] active:bg-[#4d5154] active:border-[#373b3e] focus-visible:ring-[rgba(66,70,73,0.5)]",
  link: "text-primary underline hover:text-[#a56317] bg-transparent border-transparent",
  "outline-primary":
    "text-primary border-primary bg-transparent hover:bg-primary hover:border-primary hover:text-white focus-visible:ring-[rgba(192,119,34,0.5)]",
  "outline-secondary":
    "text-secondary border-secondary bg-transparent hover:bg-secondary hover:border-secondary hover:text-white focus-visible:ring-[rgba(130,138,145,0.5)]",
  "outline-success":
    "text-success border-success bg-transparent hover:bg-success hover:border-success hover:text-white focus-visible:ring-[rgba(60,153,110,0.5)]",
  "outline-danger":
    "text-danger border-danger bg-transparent hover:bg-danger hover:border-danger hover:text-white focus-visible:ring-[rgba(225,83,97,0.5)]",
  "outline-warning":
    "text-[#664d03] border-warning bg-transparent hover:bg-warning hover:border-warning hover:text-black focus-visible:ring-[rgba(217,164,6,0.5)]",
  "outline-info":
    "text-[#055160] border-info bg-transparent hover:bg-info hover:border-info hover:text-black focus-visible:ring-[rgba(11,172,204,0.5)]",
  "outline-light":
    "text-light border-light bg-transparent hover:bg-light hover:border-light hover:text-black focus-visible:ring-[rgba(211,212,213,0.5)]",
  // Custom brand ABN (navbar Login/Register)
  "primary-custom":
    "bg-brand border-brand text-white hover:bg-brand-secondary hover:border-brand-secondary focus-visible:ring-[rgba(192,119,34,0.5)]",
  "outline-custom":
    "text-brand border-brand bg-transparent hover:bg-brand hover:border-brand hover:text-white focus-visible:ring-[rgba(192,119,34,0.5)]",
};

const SIZES = {
  sm: "px-2 py-1 text-sm rounded",
  lg: "px-[1rem] py-[0.5rem] text-lg rounded-lg",
};

function Button({
  variant = "primary",
  size,
  disabled = false,
  active = false,
  as,
  type,
  className = "",
  children,
  ...rest
}) {
  const Tag = as || "button";
  const isAnchor = Tag === "a";
  const classes = [
    "inline-block text-center whitespace-nowrap align-middle select-none border border-solid font-normal leading-[1.5] px-3 py-[0.375rem] text-base rounded-[0.375rem] transition-colors duration-150 cursor-pointer no-underline",
    VARIANTS[variant] || VARIANTS.primary,
    size ? SIZES[size] : "",
    disabled ? "opacity-65 pointer-events-none" : "",
    active ? "shadow-[inset_0_3px_5px_rgba(0,0,0,0.125)]" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const handleKeyDown = (e) => {
    if (e.key === " ") {
      e.preventDefault();
      if (!disabled && rest.onClick) rest.onClick(e);
    }
  };
  return (
    <Tag
      type={type || (Tag === "button" ? "button" : undefined)}
      disabled={disabled}
      role={Tag === "button" ? undefined : "button"}
      tabIndex={Tag === "button" || disabled ? undefined : 0}
      aria-disabled={disabled || undefined}
      className={classes}
      onKeyDown={isAnchor ? handleKeyDown : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default Button;