import { useEffect, useState } from "react";
import { applyTheme, getThemePref, setThemePref, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ThemePref; label: string }[] = [
  { id: "system", label: "Système" },
  { id: "light", label: "Clair" },
  { id: "dark", label: "Sombre" },
];

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(() => getThemePref());

  useEffect(() => {
    applyTheme(pref);
  }, [pref]);

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Thème">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          className={cn(
            "h-11 min-w-[72px] rounded-full border px-4 text-sm font-semibold",
            pref === o.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
          )}
          aria-pressed={pref === o.id}
          onClick={() => {
            setThemePref(o.id);
            setPref(o.id);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
