import { useEffect, useState } from "react";
import { applyTheme, getThemePref, resolvedTheme, setThemePref, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { Monitor, Moon, Sun } from "lucide-react";

const NEXT: Record<ThemePref, ThemePref> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABELS: Record<ThemePref, string> = {
  system: "Thème : système",
  light: "Thème : clair",
  dark: "Thème : sombre",
};

export function ThemeCycleButton() {
  const [pref, setPref] = useState<ThemePref>(() => getThemePref());
  const [dark, setDark] = useState(() => resolvedTheme(pref) === "dark");

  useEffect(() => {
    applyTheme(pref);
    setDark(resolvedTheme(pref) === "dark");
    if (pref !== "system" && typeof window !== "undefined" && window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => setDark(resolvedTheme(pref) === "dark");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, [pref]);

  const cycle = () => {
    const next = NEXT[pref];
    setThemePref(next);
    setPref(next);
  };

  return (
    <button
      type="button"
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
      )}
      onClick={cycle}
      aria-label={LABELS[pref]}
      title={LABELS[pref]}
    >
      {pref === "system" ? (
        <Monitor className="h-5 w-5" />
      ) : dark ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}
