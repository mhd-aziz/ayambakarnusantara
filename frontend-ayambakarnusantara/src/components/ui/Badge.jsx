import React from "react";

const BGS = {
  primary: "bg-primary text-white",
  secondary: "bg-secondary text-white",
  success: "bg-success text-white",
  danger: "bg-danger text-white",
  warning: "bg-warning text-black",
  info: "bg-info text-black",
  light: "bg-light text-black",
  dark: "bg-dark text-white",
};

function Badge({
  bg = "primary",
  pill = false,
  as: Tag = "span",
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "inline-block align-baseline font-bold leading-none text-center whitespace-nowrap px-[0.65em] py-[0.35em] text-[0.75em]",
    pill ? "rounded-[50rem]" : "rounded-[0.375rem]",
    BGS[bg] || BGS.primary,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}

export default Badge;