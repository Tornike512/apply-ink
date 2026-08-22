import type { ReactNode } from "react";
import { Button } from "@/components/button";
import { Container } from "@/components/container";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
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
        className="flex w-full max-w-md flex-col gap-4 p-6"
      >
        <h2 className="text-lg font-semibold text-espresso">{title}</h2>
        <p className="text-sm leading-6 text-espresso/80">{description}</p>
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </Container>
    </div>
  );
}
