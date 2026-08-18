import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="px-6 py-16 text-center text-muted-foreground">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-card">
        <Icon />
      </div>
      <b className="text-foreground">{title}</b>
      {description && <p className="mx-auto mt-1 max-w-xs text-sm">{description}</p>}
      {action && (
        <Button className="mt-4" variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
