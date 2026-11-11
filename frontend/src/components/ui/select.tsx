import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "../../lib/utils";
import { IconChevronDown } from "../icons";
import { controlClass } from "./input";

/** Native select styled to match Input, with a custom chevron. Forwards ref so
 * it composes with react-hook-form's register(). */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select ref={ref} className={cn(controlClass, "appearance-none pr-9", className)} {...props}>
          {children}
        </select>
        <IconChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>
    );
  },
);
