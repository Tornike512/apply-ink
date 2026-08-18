import type { HTMLAttributes } from "react";

type ContainerVariant = "card" | "parchment";

const variantClasses: Record<ContainerVariant, string> = {
  card: "rounded-2xl border border-sand bg-cream shadow-sm",
  parchment: "bg-sand/25",
};

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  variant?: ContainerVariant;
};

export function Container({
  variant = "card",
  className = "",
  ...props
}: ContainerProps) {
  return (
    <div className={`${variantClasses[variant]} ${className}`} {...props} />
  );
}
