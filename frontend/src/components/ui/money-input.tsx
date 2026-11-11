import type { ComponentProps } from "react";

import { formatAmount } from "../../lib/format";
import { cn } from "../../lib/utils";
import { controlClass } from "./input";

/**
 * Digits of a typed or pasted amount. A trailing 1-2 digit fraction after "." or ","
 * is dropped ("120000.00" -> 120000); 3-digit groups are thousands ("1.250.000"). Used for paste.
 */
export function parseMoneyDigits(text: string, dropFraction = true): string {
  // Typing never drops a fraction: deleting a digit of "1.250" leaves "1.25", which is still 125.
  return (dropFraction ? text.replace(/[.,]\d{1,2}$/, "") : text)
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 15);
}

/**
 * Whole VND amounts. Shows the locale's grouping while typing ("1.250.000"),
 * hands back digits only ("1250000"), so "120.000" can never be read as 120.
 */
export function MoneyInput({
  value,
  onValueChange,
  className,
  ...props
}: Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (digits: string) => void;
}) {
  const shown = value ? formatAmount(Number(value)) : "";
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={shown}
        onChange={(e) => onValueChange(parseMoneyDigits(e.target.value, false))}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (!text) return;
          e.preventDefault();
          onValueChange(parseMoneyDigits(text));
        }}
        className={cn(controlClass, "nums pr-10 text-right", className)}
        {...props}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted"
      >
        ₫
      </span>
    </div>
  );
}
