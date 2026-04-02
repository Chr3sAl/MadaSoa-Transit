import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full border text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-[var(--accent)] px-5 py-3 text-[var(--button-foreground)] shadow-[0_14px_30px_var(--accent-shadow)] hover:bg-[var(--accent-hover)]",
        secondary:
          "border-[var(--line)] bg-[var(--surface-secondary)] px-5 py-3 text-[var(--foreground)] hover:bg-[var(--surface-hover)]",
        ghost:
          "border-transparent px-4 py-2 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
