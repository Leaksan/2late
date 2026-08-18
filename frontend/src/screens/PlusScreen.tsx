import { ThemeToggle } from "@/components/ThemeToggle";
import { Card } from "@/components/ui/card";
import { canPublish } from "@/lib/domain";
import { useStore } from "@/store";
import { BookOpen, ChevronRight, Gauge, GraduationCap, User } from "lucide-react";

export function PlusScreen({
  onSyllabus,
  onGrades,
  onProfile,
  onAdmin,
}: {
  onSyllabus: () => void;
  onGrades: () => void;
  onProfile: () => void;
  onAdmin: () => void;
}) {
  const { user, badges } = useStore();
  const rows = [
    { icon: BookOpen, label: "Syllabus", hint: "Programmes et fiches de TP", onClick: onSyllabus },
    { icon: GraduationCap, label: "Mes notes & moyenne", hint: "Saisie personnelle", onClick: onGrades },
    { icon: User, label: "Profil", hint: user?.name, onClick: onProfile },
  ];
  if (user?.role === "ADMIN") {
    rows.push({
      icon: Gauge,
      label: "Admin",
      hint: badges.pendingApplications > 0 ? `${badges.pendingApplications} candidature${badges.pendingApplications > 1 ? "s" : ""}` : "Membres et annonces",
      onClick: onAdmin,
    });
  }

  return (
    <div className="screen space-y-3">
      {rows.map((r) => {
        const Icon = r.icon;
        return (
          <button key={r.label} type="button" className="w-full text-left" onClick={r.onClick}>
            <Card className="flex items-center gap-3 p-4">
              <Icon className="text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{r.label}</div>
                {r.hint && <div className="text-meta text-muted-foreground">{r.hint}</div>}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </button>
        );
      })}
      {canPublish(user) && (
        <p className="px-1 text-meta text-muted-foreground">Pour déposer un syllabus, ouvrez Syllabus puis « Déposer ».</p>
      )}
      <div className="pt-4">
        <div className="mb-2 text-over uppercase text-muted-foreground">Apparence</div>
        <ThemeToggle />
      </div>
    </div>
  );
}
