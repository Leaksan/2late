import { ReliabilityBadge, RoleBadge, TypeBadge, UrgentBadge } from "@/components/RoleBadges";
import { Card } from "@/components/ui/card";
import { announcementMatches, stripeColor } from "@/lib/domain";
import type { Announcement } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { MessageCircle } from "lucide-react";

export function AnnouncementRow({
  ann,
  q,
  urgent,
  showUrgentBadge,
  onOpen,
}: {
  ann: Announcement;
  q?: string;
  urgent?: boolean;
  showUrgentBadge?: boolean;
  onOpen: (id: string) => void;
}) {
  const showDesc = !!q && !!ann.description && announcementMatches({ title: "", description: ann.description, author: null }, q);
  return (
    <button type="button" className="w-full text-left" onClick={() => onOpen(ann.id)}>
      <Card className={`flex gap-3 p-4 ${urgent ? "border-destructive/40 bg-destructive/10" : ""}`}>
        <div className="ann-stripe" style={{ background: urgent ? "var(--red)" : stripeColor(ann.author?.role ?? "ETUDIANT") }} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap gap-1.5">
            {ann.author && <RoleBadge role={ann.author.role} />}
            {(urgent || showUrgentBadge) && ann.priority === "URGENTE" && <UrgentBadge />}
            <TypeBadge ann={ann} />
            {ann.author?.role === "RELAIS" && (
              <ReliabilityBadge pct={ann.reliability.pct} total={ann.reliability.total} overridden={ann.reliability.overridden} />
            )}
          </div>
          <div className="line-clamp-2 text-body font-semibold leading-snug">{ann.title}</div>
          {showDesc && <p className="line-clamp-2 text-meta text-muted-foreground">{ann.description}</p>}
          <div className="flex flex-wrap items-center gap-2 text-meta text-muted-foreground">
            <span>{ann.author?.name ?? "Auteur inconnu"}</span>
            <span>·</span>
            <span>{timeAgo(ann.createdAt)}</span>
            {ann.commentCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3 w-3" /> {ann.commentCount}
              </span>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}
