import React from "react";

function CloseButton({ onClick, disabled, label = "Close", className = "", ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`box-content w-4 h-4 p-1 text-black bg-transparent border-0 rounded-[0.25rem] opacity-50 hover:opacity-75 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[rgba(13,110,253,0.25)] disabled:pointer-events-none disabled:opacity-25 ${className}`}
      {...rest}
    >
      <span aria-hidden="true" className="block text-[1.5rem] leading-none">&times;</span>
    </button>
  );
}

export default CloseButton;