import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-sienna text-cream hover:bg-espresso",
  secondary: "bg-sand text-espresso hover:bg-terracotta hover:text-cream",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
