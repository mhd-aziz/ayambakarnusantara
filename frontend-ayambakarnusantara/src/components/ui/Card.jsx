import React from "react";

const BORDERS = {
  light: "border-[#f8f9fa]",
  primary: "border-primary",
  secondary: "border-secondary",
  success: "border-success",
  danger: "border-danger",
  warning: "border-warning",
  info: "border-info",
  dark: "border-dark",
};

function Card({
  border,
  className = "",
  children,
  ...rest
}) {
  return (
    <div
      className={`bg-white border border-[rgba(0,0,0,0.125)] rounded-[0.375rem] ${ border ? BORDERS[border] || "" : "" } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

const Header = ({ className = "", children, ...rest }) => (
  <div
    className={`p-3 border-b border-[rgba(0,0,0,0.125)] bg-[rgba(0,0,0,0.03)] ${className}`}
    {...rest}
  >
    {children}
  </div>
);
const Body = ({ className = "", children, ...rest }) => (
  <div className={`p-4 ${className}`} {...rest}>
    {children}
  </div>
);
const Title = ({ as: Tag = "h5", className = "", children, ...rest }) => (
  <Tag className={`mb-2 font-medium text-[1.25rem] leading-[1.2] ${className}`} {...rest}>
    {children}
  </Tag>
);
const Subtitle = ({ as: Tag = "h6", className = "", children, ...rest }) => (
  <Tag className={`mt-[-0.375rem] mb-2 font-medium text-[1rem] text-muted ${className}`} {...rest}>
    {children}
  </Tag>
);
const Text = ({ as: Tag = "p", className = "", children, ...rest }) => (
  <Tag className={`mb-[0.5rem] text-base ${className}`} {...rest}>
    {children}
  </Tag>
);
const Link = ({ className = "", children, ...rest }) => (
  <a className={`text-primary no-underline hover:text-[#a56317] ${className}`} {...rest}>
    {children}
  </a>
);
const Footer = ({ className = "", children, ...rest }) => (
  <div
    className={`p-3 border-t border-[rgba(0,0,0,0.125)] bg-[rgba(0,0,0,0.03)] ${className}`}
    {...rest}
  >
    {children}
  </div>
);
const Img = ({ variant = "top", className = "", children, ...rest }) => (
  <div
    className={`w-full ${ variant === "top" ? "rounded-t-[calc(0.375rem-1px)]" : "" } ${className}`}
    {...rest}
  >
    {children}
  </div>
);
const ImgOverlay = ({ className = "", children, ...rest }) => (
  <div
    className={`absolute inset-0 p-4 rounded-[calc(0.375rem-1px)] ${className}`}
    {...rest}
  >
    {children}
  </div>
);

Card.Header = Header;
Card.Body = Body;
Card.Title = Title;
Card.Subtitle = Subtitle;
Card.Text = Text;
Card.Link = Link;
Card.Footer = Footer;
Card.Img = Img;
Card.ImgOverlay = ImgOverlay;

export default Card;