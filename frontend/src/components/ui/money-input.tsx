import type { ComponentProps } from "react";

import { formatAmount } from "../../lib/format";
import { cn } from "../../lib/utils";
import { controlClass } from "./input";

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
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15))}
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
