import { AlertCircle } from "lucide-react";
import type { LabelHTMLAttributes } from "react";

import { cn } from "../../lib/utils";

/** A visible label above its field; `required` adds the asterisk. */
export function Label({
  className,
  required,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-ink", className)} {...props}>
      {children}
      {required && (
        <span aria-hidden="true" className="ml-0.5 text-expense">
          *
        </span>
      )}
    </label>
  );
}

/** The message under an invalid field; give the field aria-describedby={id}. */
export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-expense">
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

/** Help text under a field. */
export function FieldHint({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-muted">
      {children}
    </p>
  );
}
