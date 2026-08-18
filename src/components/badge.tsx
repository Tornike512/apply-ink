import type { HTMLAttributes } from "react";

type BadgeVariant = "sand" | "terracotta" | "sienna" | "success";

const variantClasses: Record<BadgeVariant, string> = {
  sand: "bg-sand text-espresso",
  terracotta: "bg-terracotta text-cream",
  sienna: "bg-sienna text-cream",
  success: "bg-success/15 text-success",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({
  variant = "sand",
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
