import React from "react";

const FormControlContext = React.createContext(null);

function Form({ className = "", children, ...rest }) {
  return (
    <form className={className} {...rest}>
      {children}
    </form>
  );
}

const Group = ({ controlId, className = "", children, ...rest }) => (
  <FormControlContext.Provider value={controlId}>
    <div className={`mb-3 ${className}`} {...rest}>
      {children}
    </div>
  </FormControlContext.Provider>
);

const Label = ({ className = "", children, ...rest }) => {
  const controlId = React.useContext(FormControlContext);
  return (
    <label
      htmlFor={controlId}
      className={`inline-block mb-2 text-base ${className}`}
      {...rest}
    >
      {children}
    </label>
  );
};

function Control({
  as: Tag = "input",
  size,
  className = "",
  isInvalid,
  isValid,
  readOnly,
  ...rest
}) {
  const controlId = React.useContext(FormControlContext);
  const classes = [
    "block w-full p-[0.375rem_0.75rem] text-base leading-6 bg-white text-dark bg-clip-padding border border-line rounded-[0.375rem] transition-[border-color,box-shadow] duration-150 appearance-none",
    "placeholder:text-[#6c757d]",
    "focus:outline-none focus:border-[#c07722] focus:ring-4 focus:ring-[rgba(192,119,34,0.25)]",
    "disabled:bg-[#e9ecef] disabled:opacity-100",
    size === "sm" ? "p-[0.25rem_0.5rem] text-sm rounded-[0.25rem]" : "",
    size === "lg" ? "p-[0.5rem_1rem] text-lg rounded-[0.5rem]" : "",
    isInvalid ? "border-danger focus:border-danger focus:ring-[rgba(220,53,69,0.25)]" : "",
    isValid ? "border-success focus:border-success focus:ring-[rgba(25,135,84,0.25)]" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag
      id={controlId}
      readOnly={readOnly}
      className={classes}
      {...rest}
    />
  );
}

function Select({ size, className = "", children, ...rest }) {
  const controlId = React.useContext(FormControlContext);
  const classes = [
    "block w-full p-[0.375rem_2.25rem_0.375rem_0.75rem] text-base leading-6 bg-white text-dark border border-line rounded-[0.375rem] transition-[border-color,box-shadow] duration-150 appearance-none",
    "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22%23333%22%20viewBox%3D%220%200%2016%2016%22%3E%3Cpath%20d%3D%22M1.646%204.646a.5.5%200%200%201%20.708%200L8%2010.293l5.646-5.647a.5.5%200%200%201%20.708.708l-6%206a.5.5%200%200%201-.708%200l-6-6a.5.5%200%200%201%200-.708z%22/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat bg-[size:16px_12px]",
    "focus:outline-none focus:border-[#c07722] focus:ring-4 focus:ring-[rgba(192,119,34,0.25)]",
    "disabled:bg-[#e9ecef]",
    size === "sm" ? "p-[0.25rem_1.5rem_0.25rem_0.5rem] text-sm rounded-[0.25rem]" : "",
    size === "lg" ? "p-[0.5rem_2.25rem_0.5rem_1rem] text-lg rounded-[0.5rem]" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <select id={controlId} className={classes} {...rest}>
      {children}
    </select>
  );
}

const Text = ({ className = "", children, ...rest }) => (
  <div className={`mt-1 text-sm text-muted ${className}`} {...rest}>
    {children}
  </div>
);

const Check = ({ type = "checkbox", label, id, className = "", children, ...rest }) => {
  const controlId = React.useContext(FormControlContext);
  const checkId = id || controlId || `form-check-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <div className={`flex items-center gap-2 mb-2 min-h-[1.5rem] ${className}`}>
      <input
        id={checkId}
        type={type}
        className="w-4 h-4 shrink-0 align-middle accent-[#c07722]"
        {...rest}
      />
      {label && (
        <label htmlFor={checkId} className="text-base">
          {label}
        </label>
      )}
      {children}
    </div>
  );
};

Form.Group = Group;
Form.Label = Label;
Form.Control = Control;
Form.Select = Select;
Form.Text = Text;
Form.Check = Check;

export default Form;