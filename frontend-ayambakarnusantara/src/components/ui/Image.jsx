import React from "react";

function Image({
  fluid = false,
  rounded = false,
  roundedCircle = false,
  thumbnail = false,
  className = "",
  ...rest
}) {
  const classes = [
    fluid ? "max-w-full h-auto" : "",
    rounded ? "rounded-[0.375rem]" : "",
    roundedCircle ? "rounded-full" : "",
    thumbnail
      ? "p-1 bg-white border border-line rounded-[0.375rem] max-w-full h-auto"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <img className={classes} {...rest} />;
}

export default Image;