import { ApiError } from "./api";

export type ErrorKind = "auth" | "network" | "http";

export function classifyError(e: unknown): ErrorKind {
  if (e instanceof ApiError && e.status === 401) return "auth";
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "network";
  if (e instanceof TypeError) return "network";
  if (e instanceof ApiError && e.status >= 500) return "http";
  if (e instanceof ApiError) return "http";
  return "network";
}
