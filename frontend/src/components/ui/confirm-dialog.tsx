import { useEffect, useRef, useState, type ReactNode } from "react";

import { useErrorText, useT } from "../../lib/i18n";
import { Button } from "./button";
import { Modal } from "./modal";
import { InlineAlert } from "./states";

/**
 * A decision the user must make now. The title names the object, the body the
 * consequence; focus starts on Cancel so Enter never confirms by accident.
 * `onConfirm` may return a promise: the dialog shows a spinner, closes on
 * success and stays open with the error inline on failure.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel,
  tone = "destructive",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "destructive" | "default";
  onConfirm: () => unknown | Promise<unknown>;
  onClose: () => void;
}) {
  const t = useT();
  const errText = useErrorText();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setPending(false);
    }
  }, [open]);

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(errText(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal open={open} onClose={() => !pending && onClose()} title={title} size="sm" initialFocusRef={cancelRef}>
      {children && <div className="space-y-2 text-sm text-charcoal">{children}</div>}
      {error && (
        <InlineAlert tone="error" className="mt-4">
          {error}
        </InlineAlert>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button ref={cancelRef} type="button" variant="secondary" onClick={onClose} disabled={pending}>
          {cancelLabel ?? t("common.cancel")}
        </Button>
        <Button
          type="button"
          variant={tone === "destructive" ? "destructive" : "primary"}
          loading={pending}
          onClick={() => void confirm()}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
