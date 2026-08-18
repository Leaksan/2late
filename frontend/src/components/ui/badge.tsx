import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/20 text-primary",
        secondary: "border-border bg-card-2 text-muted-foreground",
        destructive: "border-destructive/50 bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        reliable: "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-400",
        contested: "border-destructive/40 bg-destructive/10 text-destructive",
        urgent: "border-destructive/50 bg-destructive text-destructive-foreground",
        prof: "border-[#1d4f8a]/25 bg-[#dbeafe] text-[#1d4f8a] dark:border-[#7CB9FF]/35 dark:bg-[#7CB9FF]/15 dark:text-[#7CB9FF]",
        relais: "border-[#854d0e]/25 bg-[#fef3c7] text-[#854d0e] dark:border-[#E5C100]/35 dark:bg-[#E5C100]/15 dark:text-[#F5D825]",
        admin: "border-[#5b21b6]/25 bg-[#ede9fe] text-[#5b21b6] dark:border-[#B9A4FF]/35 dark:bg-[#B9A4FF]/15 dark:text-[#C3AEFF]",
        etudiant: "border-[#3f4b5b]/20 bg-[#e5e7eb] text-[#3f4b5b] dark:border-[#9AA7B8]/30 dark:bg-[#9AA7B8]/10 dark:text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
