import type { Announcement } from "@/lib/types";
import { AnnouncementRow } from "./AnnouncementRow";

export function UrgentStack({
  items,
  expanded,
  onToggle,
  onOpen,
}: {
  items: Announcement[];
  expanded: boolean;
  onToggle: () => void;
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;
  const shown = expanded || items.length <= 3 ? items : items.slice(0, 3);
  const extra = items.length - 3;
  return (
    <div className="mt-4 space-y-2">
      {shown.map((ann) => (
        <AnnouncementRow key={ann.id} ann={ann} urgent onOpen={onOpen} />
      ))}
      {items.length > 3 && (
        <button type="button" className="h-11 w-full text-sm font-semibold text-primary" onClick={onToggle}>
          {expanded ? "Réduire" : `+${extra} autres urgentes`}
        </button>
      )}
    </div>
  );
}
