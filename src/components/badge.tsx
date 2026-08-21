import type { HTMLAttributes } from "react";

type BadgeVariant = "sand" | "terracotta" | "sienna" | "success";

const variantClasses: Record<BadgeVariant, string> = {
  sand: "border-sand/90 bg-surface/72 text-espresso/72",
  terracotta: "border-terracotta/45 bg-terracotta/12 text-espresso",
  sienna: "border-sienna/35 bg-sienna/10 text-sienna",
  success: "border-success/30 bg-success/10 text-success",
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
      className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-[0.7rem] leading-none font-semibold whitespace-nowrap shadow-[0_1px_2px_rgba(78,47,36,0.06)] ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
