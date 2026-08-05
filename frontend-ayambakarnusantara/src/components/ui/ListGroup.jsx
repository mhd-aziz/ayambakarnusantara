import React from "react";

function ListGroup({
  variant,
  className = "",
  children,
  ...rest
}) {
  const flush = variant === "flush";
  const classes = [
    "flex flex-col",
    flush ? "" : "rounded-[0.375rem]",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={classes} {...rest}>{children}</div>;
}

const Item = ({
  variant,
  action = false,
  active = false,
  disabled = false,
  as: Tag = "div",
  className = "",
  children,
  ...rest
}) => {
  const classes = [
    "relative block px-4 py-2 text-base bg-white border border-line",
    active
      ? "z-[2] text-white bg-primary border-primary"
      : "text-dark",
    action
      ? "w-full text-left hover:z-[2] hover:text-[#495057] hover:bg-[#f8f9fa] hover:border-[#dee2e6]"
      : "",
    disabled ? "text-[#6c757d] pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
};

ListGroup.Item = Item;

export default ListGroup;