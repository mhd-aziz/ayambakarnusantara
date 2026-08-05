import React, { useState, useRef, useEffect } from "react";

const DropdownContext = React.createContext(null);

function Dropdown({ align = "start", className = "", children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);
  return (
    <DropdownContext.Provider value={{ open, setOpen, align }}>
      <div ref={ref} className={`relative inline-block ${className}`}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

const Toggle = ({ id, variant = "primary", className = "", children, ...rest }) => {
  const { open, setOpen } = React.useContext(DropdownContext);
  return (
    <button
      id={id}
      type="button"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={`inline-block text-center whitespace-nowrap align-middle select-none border border-solid font-normal leading-[1.5] px-3 py-[0.375rem] text-base rounded-[0.375rem] transition-colors duration-150 cursor-pointer bg-primary border-primary text-white hover:bg-[#a56317] hover:border-[#a56317] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

const Menu = ({ align, className = "", children }) => {
  const { open, align: ctxAlign } = React.useContext(DropdownContext);
  if (!open) return null;
  const pos = ctxAlign === "end" ? "right-0" : "left-0";
  return (
    <div
      className={`absolute z-[1000] ${pos} top-full mt-1 min-w-[10rem] p-1 text-base bg-white border border-[rgba(0,0,0,0.15)] rounded-[0.375rem] shadow-[0_0.5rem_1rem_rgba(0,0,0,0.175)] ${className}`}
    >
      {children}
    </div>
  );
};

const Item = ({ active = false, disabled = false, className = "", children, ...rest }) => (
  <button
    type="button"
    disabled={disabled}
    className={`block w-full text-left px-3 py-1 clear-both text-base no-underline whitespace-nowrap bg-transparent border-0 cursor-pointer ${ active ? "text-white bg-primary" : "text-dark hover:bg-[#e9ecef]" } ${disabled ? "text-[#6c757d] pointer-events-none" : ""} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

Dropdown.Toggle = Toggle;
Dropdown.Menu = Menu;
Dropdown.Item = Item;

export default Dropdown;