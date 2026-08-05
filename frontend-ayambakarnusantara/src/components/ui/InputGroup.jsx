import React from "react";

function InputGroup({ className = "", children, ...rest }) {
  return (
    <div
      className={`relative flex flex-wrap items-stretch w-full [&>*:not(:first-child)]:ml-[-1px] [&>*:not(:last-child)]:rounded-r-none [&>*:not(:first-child)]:rounded-l-none [&>*:focus]:z-[3] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

const Text = ({ className = "", children, ...rest }) => (
  <span
    className={`flex items-center px-3 py-[0.375rem] text-base font-normal leading-6 text-[#212529] text-center whitespace-nowrap bg-[#e9ecef] border border-line rounded-[0.375rem] ${className}`}
    {...rest}
  >
    {children}
  </span>
);

InputGroup.Text = Text;

export default InputGroup;