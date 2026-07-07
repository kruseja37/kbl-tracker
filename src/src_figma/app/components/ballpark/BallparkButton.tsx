import type { ButtonHTMLAttributes, ReactNode } from "react";

import "../../../styles/ballpark-kit.css";

type BallparkButtonVariant = "primary" | "secondary" | "danger";

export interface BallparkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: BallparkButtonVariant;
}

export function BallparkButton({
  children,
  className = "",
  icon,
  type = "button",
  variant = "primary",
  ...props
}: BallparkButtonProps) {
  const variantClass = {
    primary: "ballpark-press-gold",
    secondary: "ballpark-press-default",
    danger: "ballpark-press-destruct",
  }[variant];

  return (
    <button
      type={type}
      className={`ballpark-press-button ballpark-press-md ${variantClass}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
