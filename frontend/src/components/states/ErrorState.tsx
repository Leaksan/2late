import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function ErrorState({ title, description, onRetry }: { title: string; description?: string; onRetry?: () => void }) {
  return (
    <div className="px-6 py-16 text-center text-muted-foreground">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-lg border border-destructive/40 bg-destructive/10 text-destructive">
        <AlertTriangle />
      </div>
      <b className="text-foreground">{title}</b>
      {description && <p className="mx-auto mt-1 max-w-xs text-sm">{description}</p>}
      {onRetry && (
        <Button className="mt-4" variant="outline" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
