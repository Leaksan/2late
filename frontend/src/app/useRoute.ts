import { useCallback, useEffect, useRef, useState } from "react";
import { parseHash, toHash, type Route } from "./routes";

export type NavigateOpts = { replace?: boolean; scroll?: boolean };

export function useRoute() {
  const [route, setRoute] = useState<Route>(() => parseHash(typeof window === "undefined" ? "" : window.location.hash));
  const lastAppliedHash = useRef(typeof window === "undefined" ? "" : window.location.hash || "#/");

  const apply = useCallback((next: Route, opts: NavigateOpts = {}) => {
    const hash = toHash(next);
    lastAppliedHash.current = hash;
    if (opts.replace) {
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", `${pathname}${search}${hash}`);
    } else {
      window.location.hash = hash;
    }
    setRoute(next);
    if (opts.scroll !== false && !opts.replace) {
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const onHash = () => {
      if (window.location.hash === lastAppliedHash.current) return;
      lastAppliedHash.current = window.location.hash;
      setRoute(parseHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return { route, navigate: apply };
}
