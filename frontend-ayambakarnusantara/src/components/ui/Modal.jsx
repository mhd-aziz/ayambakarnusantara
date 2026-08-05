import React, { useEffect } from "react";
import { createPortal } from "react-dom";

const SIZES = {
  sm: "max-w-[300px]",
  lg: "max-w-[800px]",
  xl: "max-w-[1140px]",
};

function Modal({
  show = false,
  onHide,
  centered = false,
  size,
  backdrop = true,
  scrollable = false,
  keyboard = true,
  dialogClassName = "",
  contentClassName = "",
  className = "",
  children,
}) {
  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape" && keyboard) onHide && onHide();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [show, keyboard, onHide]);

  if (!show) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[1055] ${className}`} role="dialog" aria-modal="true">
      {backdrop && (
        <div
          className="absolute inset-0 bg-[rgba(33,37,41,0.5)]"
          onClick={() => {
            if (backdrop !== "static") onHide && onHide();
          }}
        />
      )}
      <div
        className={`relative mx-auto my-[1.75rem] pointer-events-none h-full ${ centered ? "flex items-center min-h-[calc(100%-3.5rem)]" : "" }`}
      >
        <div
          className={`relative flex flex-col w-full pointer-events-auto bg-white bg-clip-padding border border-[rgba(0,0,0,0.2)] rounded-[0.5rem] shadow-[0_0.5rem_1rem_rgba(0,0,0,0.15)] outline-none ${ SIZES[size] || "max-w-[500px]" } ${dialogClassName} ${scrollable ? "max-h-[calc(100%-3.5rem)] overflow-y-auto" : ""}`}
        >
          <div className={contentClassName}>{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const Header = ({ closeButton = false, onHide, className = "", children, ...rest }) => (
  <div
    className={`flex shrink-0 items-center justify-between p-4 border-b border-[#dee2e6] rounded-t-[calc(0.5rem-1px)] ${className}`}
    {...rest}
  >
    {children}
    {closeButton && (
      <button
        type="button"
        onClick={onHide}
        aria-label="Close"
        className="ml-auto text-[#000] opacity-50 hover:opacity-75 text-[1.5rem] font-normal leading-none bg-transparent border-0 p-1 cursor-pointer"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    )}
  </div>
);
const Title = ({ as: Tag = "div", className = "", children, ...rest }) => (
  <Tag className={`mb-0 text-[1.25rem] leading-[1.5] font-medium ${className}`} {...rest}>
    {children}
  </Tag>
);
const Body = ({ className = "", children, ...rest }) => (
  <div className={`relative flex-1 p-4 ${className}`} {...rest}>
    {children}
  </div>
);
const Footer = ({ className = "", children, ...rest }) => (
  <div
    className={`flex shrink-0 flex-wrap items-center justify-end p-3 gap-2 border-t border-[#dee2e6] rounded-b-[calc(0.5rem-1px)] ${className}`}
    {...rest}
  >
    {children}
  </div>
);

Modal.Header = Header;
Modal.Title = Title;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;