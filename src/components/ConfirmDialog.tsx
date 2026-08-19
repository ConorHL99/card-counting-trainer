"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic confirmation modal. Used for the counting-system switch
 * notice (CLAUDE.md rule #4 — a system switch must show a clear
 * notice/confirmation before resetting the running count), and
 * reusable anywhere else a destructive/resetting action needs one.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-felt-950/70 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-sm rounded-card border border-felt-line bg-felt-900 p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-card px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-card bg-gold-500 px-3 py-1.5 text-sm font-medium text-felt-950 hover:bg-gold-400"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
