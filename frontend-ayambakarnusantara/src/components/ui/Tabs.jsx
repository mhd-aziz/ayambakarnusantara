import React from "react";

function Tabs({
  activeKey,
  onSelect,
  className = "",
  children,
}) {
  return (
    <div className={className}>
      <div
        className="flex flex-wrap border-b border-line"
        role="tablist"
        onSelect={onSelect}
      >
        {React.Children.map(children, (child) =>
          child
            ? React.cloneElement(child, {
                active: child.props.eventKey === activeKey,
                onSelect,
              })
            : null
        )}
      </div>
    </div>
  );
}

function Tab({ eventKey, title, active, onSelect, disabled }) {
  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      onClick={() => !disabled && onSelect && onSelect(eventKey)}
      className={`px-3 py-2 mb-[-1px] border border-transparent rounded-t-[0.375rem] no-underline cursor-pointer bg-transparent ${
        active
          ? "text-[#495057] bg-white border-line border-b-white"
          : "text-primary hover:border-line hover:bg-[#f8f9fa]"
      }`}
    >
      {title}
    </button>
  );
}

Tabs.Tab = Tab;

export default Tabs;
