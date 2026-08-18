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
        destructive: "border-red-500/50 bg-[#6E2727] text-white",
        outline: "text-foreground",
        reliable: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
        contested: "border-red-400/40 bg-red-400/10 text-red-400",
        urgent: "border-red-400/50 bg-[#6E2727] text-white",
        prof: "border-[#7CB9FF]/35 bg-[#7CB9FF]/15 text-[#7CB9FF]",
        relais: "border-[#E5C100]/35 bg-[#E5C100]/15 text-[#F5D825]",
        admin: "border-[#B9A4FF]/35 bg-[#B9A4FF]/15 text-[#C3AEFF]",
        etudiant: "border-[#9AA7B8]/30 bg-[#9AA7B8]/10 text-muted-foreground",
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
