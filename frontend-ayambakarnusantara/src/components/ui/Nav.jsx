import React from "react";

function Nav({
  variant,
  as: Tag = "div",
  fill = false,
  className = "",
  children,
  ...rest
}) {
  const classes = [
    "flex flex-wrap",
    variant === "tabs" ? "border-b border-line" : "",
    variant === "pills" ? "gap-1" : "",
    fill ? "w-full [&>*]:flex-1 [&>*]:text-center" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <Tag className={classes} {...rest}>{children}</Tag>;
}

const Item = ({ as: Tag = "div", className = "", children, ...rest }) => (
  <Tag className={className} {...rest}>{children}</Tag>
);

const Link = ({
  as: Tag = "a",
  active = false,
  disabled = false,
  variant,
  className = "",
  children,
  ...rest
}) => {
  const classes = [
    "block px-3 py-2 no-underline text-base",
    variant === "tabs"
      ? "border border-transparent rounded-t-[0.375rem] mb-[-1px] hover:border-line hover:bg-[#f8f9fa] " +
        (active ? "!text-[#495057] bg-white border-line border-b-white" : "text-primary")
      : variant === "pills"
      ? "rounded-[0.375rem] " + (active ? "bg-primary text-white" : "text-[#495057] hover:bg-[#e9ecef]")
      : active
      ? "text-primary"
      : "text-primary hover:text-[#a56317]",
    disabled ? "text-[#6c757d] pointer-events-none" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <Tag className={classes} {...rest}>{children}</Tag>;
};

Nav.Item = Item;
Nav.Link = Link;

export default Nav;