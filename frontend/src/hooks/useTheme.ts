import { useEffect, useState } from "react";

const KEY = "twolate.theme";

function currentTheme(): "light" | "dark" {
  return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
}

// Bascule clair/sombre : la classe .dark sur <html> pilote toute la palette
// (variables CSS + variantes Tailwind dark:). Thème clair par défaut,
// choix mémorisé.
export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(currentTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0B0E13" : "#F4F6FA");
  }, [theme]);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem(KEY, next);
    setTheme(next);
  };

  return { theme, toggle };
}
