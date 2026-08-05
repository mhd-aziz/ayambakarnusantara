import React from "react";

function Breadcrumb({ className = "", children, ...rest }) {
  return (
    <nav aria-label="breadcrumb" className={className} {...rest}>
      <ol className="flex flex-wrap p-0 mb-0 list-none">{children}</ol>
    </nav>
  );
}

const Item = ({
  active = false,
  as: Tag = "li",
  className = "",
  children,
  ...rest
}) => (
  <Tag
    className={`flex items-center text-base ${ active ? "text-[#6c757d]" : "" } [&:not(:first-child)]:before:content-['/'] [&:not(:first-child)]:before:mx-2 [&:not(:first-child)]:before:text-[#6c757d] ${className}`}
    {...rest}
  >
    {children}
  </Tag>
);

Breadcrumb.Item = Item;

export default Breadcrumb;