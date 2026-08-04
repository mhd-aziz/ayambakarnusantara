import React, { createContext, useContext, forwardRef } from "react";

/* Navbar — meniru API react-bootstrap (Navbar/Toggle/Brand/Collapse)
   styling utama dari Navbar.css (sudah dikonversi ke Tailwind @apply) */
const NavbarContext = createContext({ expanded: false, onToggle: () => {} });

const Navbar = forwardRef(function Navbar(
  { expand, sticky, expanded, onToggle, className = "", children, ...rest },
  ref
) {
  return (
    <NavbarContext.Provider value={{ expanded, onToggle }}>
      <nav
        ref={ref}
        {...rest}
        className={`navbar relative flex flex-wrap items-center justify-between pt-2 pb-2 ${
          sticky === "top" ? "sticky top-0" : ""
        } ${className}`}
      >
        {children}
      </nav>
    </NavbarContext.Provider>
  );
});

Navbar.Toggle = function NavbarToggle({ className = "", ...rest }) {
  const { expanded, onToggle } = useContext(NavbarContext);
  return (
    <button
      type="button"
      {...rest}
      onClick={onToggle}
      aria-expanded={expanded}
      className={`navbar-toggler xl:hidden ${className}`}
    >
      <span className="navbar-toggler-icon inline-block h-[1.5em] w-[1.5em] bg-contain bg-center bg-no-repeat align-middle" />
    </button>
  );
};

Navbar.Brand = function NavbarBrand({ as: Tag = "a", className = "", children, ...rest }) {
  return (
    <Tag {...rest} className={`navbar-brand mr-4 pt-[0.3125rem] pb-[0.3125rem] text-[1.25rem] no-underline whitespace-nowrap ${className}`}>
      {children}
    </Tag>
  );
};

Navbar.Collapse = function NavbarCollapse({ id, className = "", children, ...rest }) {
  const { expanded } = useContext(NavbarContext);
  return (
    <div
      id={id}
      {...rest}
      className={`navbar-collapse grow basis-full items-center xl:flex xl:basis-auto ${
        expanded ? "show" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Navbar;
