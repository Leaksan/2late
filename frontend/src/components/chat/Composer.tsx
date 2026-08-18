import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export function Composer({
  value,
  onChange,
  onSend,
  disabled,
  replyLabel,
  onCancelReply,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  replyLabel?: string;
  onCancelReply?: () => void;
}) {
  return (
    <div>
      {replyLabel && (
        <div className="mb-2 flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs">
          Réponse à {replyLabel}
          <button type="button" onClick={onCancelReply} aria-label="Annuler la réponse">
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void onSend()}
          placeholder="Message · @ pour mentionner"
          aria-label="Message"
          disabled={disabled}
        />
        <Button size="icon" onClick={onSend} disabled={disabled || !value.trim()} aria-label="Envoyer">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
