import React from "react";

function Pagination({ size, className = "", children, ...rest }) {
  const classes = [
    "flex flex-wrap pl-0 mb-0 list-none rounded-[0.375rem]",
    size === "sm" ? "[&_.page-link]:px-2 [&_.page-link]:py-1 [&_.page-link]:text-sm" : "",
    size === "lg" ? "[&_.page-link]:px-[1.125rem] [&_.page-link]:py-[0.75rem] [&_.page-link]:text-lg" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <ul className={classes} {...rest}>{children}</ul>;
}

const Item = ({ active = false, disabled = false, className = "", children, ...rest }) => (
  <li className={`${active ? "active" : ""} ${disabled ? "disabled" : ""} ${className}`} {...rest}>
    {children}
  </li>
);

const pageLink = (label) => ({ className = "", children, ...rest }) => (
  <a
    href="#"
    onClick={(e) => e.preventDefault()}
    className={`page-link relative block px-3 py-2 ml-[-1px] border border-line text-primary bg-white no-underline hover:z-[3] hover:bg-[#e9ecef] hover:border-line hover:text-[#a56317] [.active>&]:z-[3] [.active>&]:bg-primary [.active>&]:border-primary [.active>&]:text-white [.disabled>&]:pointer-events-none [.disabled>&]:bg-white [.disabled>&]:text-[#6c757d] ${className}`}
    {...rest}
  >
    {children || label}
  </a>
);

const First = pageLink("«");
const Prev = pageLink("‹");
const Ellipsis = pageLink("…");
const Next = pageLink("›");
const Last = pageLink("»");

Pagination.Item = Item;
Pagination.First = First;
Pagination.Prev = Prev;
Pagination.Ellipsis = Ellipsis;
Pagination.Next = Next;
Pagination.Last = Last;

export default Pagination;