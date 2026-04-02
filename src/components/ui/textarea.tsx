import * as React from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-28 w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--field-focus)] focus:ring-4 focus:ring-[var(--accent-soft)]",
        className,
      )}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
