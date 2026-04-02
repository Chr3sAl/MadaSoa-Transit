import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--field-focus)] focus:ring-4 focus:ring-[var(--accent-soft)]",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
