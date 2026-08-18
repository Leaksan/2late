import { Badge } from "@/components/ui/badge";
import { reliabilityBadge } from "@/lib/domain";
import type { Announcement, Role } from "@/lib/types";
import { ROLE_SHORT, TYPE_INFO } from "@/lib/types";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export function RoleBadge({ role }: { role: Role }) {
  const variant = role === "PROF" ? "prof" : role === "RELAIS" ? "relais" : role === "ADMIN" ? "admin" : "etudiant";
  return <Badge variant={variant}>{ROLE_SHORT[role]}</Badge>;
}

export function UrgentBadge() {
  return <Badge variant="urgent">URGENT</Badge>;
}

export function TypeBadge({ ann }: { ann: Pick<Announcement, "type"> }) {
  return <Badge variant="secondary">{TYPE_INFO[ann.type].label}</Badge>;
}

export function ReliabilityBadge({ pct, total, overridden }: { pct: number | null; total: number; overridden?: boolean }) {
  const kind = reliabilityBadge(pct, total);
  if (kind === "Fiable") {
    return (
      <Badge variant="reliable">
        <CheckCircle2 className="h-3 w-3" /> Fiable · {pct}%{overridden ? " · admin" : ""}
      </Badge>
    );
  }
  if (kind === "Non notée") return <Badge variant="secondary">Non notée</Badge>;
  return (
    <Badge variant="contested">
      <AlertCircle className="h-3 w-3" /> Contestée · {pct ?? 0}%{overridden ? " · admin" : ""}
    </Badge>
  );
}
