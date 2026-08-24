import type { ReactNode } from "react";
import { CloseIcon } from "@/assets";
import { Button } from "@/components/button";
import { Container } from "@/components/container";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  icon,
  footer,
  className,
  children,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/50 p-4"
    >
      <Container
        variant="card"
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full max-w-3xl flex-col gap-5 p-5 sm:p-7 ${className ?? ""}`}
      >
        <div className="flex items-start gap-4">
          {icon && (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-terracotta/20 text-sienna">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-bold text-espresso">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-espresso/70">{description}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            aria-label="Close dialog"
            onClick={onCancel}
            className="h-12 w-12 shrink-0 rounded-xl border border-sand bg-surface p-0 text-espresso hover:bg-sand/30"
          >
            <CloseIcon width={22} height={22} />
          </Button>
        </div>
        {children}
        <div className="flex justify-end gap-2 border-t border-sand/60 pt-4">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
        {footer && (
          <div className="grid gap-3 border-t border-sand/60 pt-4 text-xs text-espresso/65 sm:grid-cols-3">
            {footer}
          </div>
        )}
      </Container>
    </div>
  );
}
