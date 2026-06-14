import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "../../lib/utils";
import { IconChevronDown } from "../icons";

/** Native select styled to match Input, with a custom chevron. Forwards ref so
 * it composes with react-hook-form's register(). */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "h-11 w-full appearance-none rounded-md border border-line bg-surface pl-3 pr-9 text-sm text-ink",
            "outline-none transition-colors duration-150",
            "focus:border-brand focus:ring-2 focus:ring-brand/15",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <IconChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    );
  },
);
