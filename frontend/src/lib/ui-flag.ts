export type UiFlag = "v1" | "v2";

export function resolveUiFlag(): UiFlag {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("2late.ui");
    if (stored === "v1" || stored === "v2") return stored;
  }
  const env = (import.meta.env.VITE_UI_DEFAULT as string | undefined) ?? "";
  if (env === "v1" || env === "v2") return env;
  return "v1";
}

export function setUiFlag(flag: UiFlag) {
  localStorage.setItem("2late.ui", flag);
}
