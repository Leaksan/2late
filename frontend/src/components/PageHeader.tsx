import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  actions,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {onBack && (
        <Button variant="outline" size="icon" onClick={onBack} aria-label={backLabel || "Retour"}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-title truncate">{title}</h1>
        {subtitle && <p className="text-meta text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}
