import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      tone: {
        neutral: "border-[var(--line)] bg-[var(--surface-secondary)] text-[var(--muted)]",
        accent: "border-transparent bg-[var(--accent-soft)] text-[var(--brand-hover)]",
        success: "border-transparent bg-[var(--success-soft)] text-[var(--success)]",
        warning: "border-transparent bg-[var(--warning-soft)] text-[var(--warning)]",
        danger: "border-transparent bg-[var(--danger-soft)] text-[var(--danger)]",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ tone }), className)} {...props} />;
}
