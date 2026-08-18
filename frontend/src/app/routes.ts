export type FromView = "today" | "admin" | "plus" | "rooms" | "schedule";

export type RouteQuery = {
  slot?: string;
  note?: string;
  from?: FromView;
};

export type Route =
  | { name: "today"; query: RouteQuery }
  | { name: "detail"; annId: string; query: RouteQuery }
  | { name: "publish"; query: RouteQuery }
  | { name: "rooms"; query: RouteQuery }
  | { name: "chat"; roomId: string; query: RouteQuery }
  | { name: "schedule"; query: RouteQuery }
  | { name: "syllabus"; query: RouteQuery }
  | { name: "profile"; query: RouteQuery }
  | { name: "grades"; query: RouteQuery }
  | { name: "admin"; query: RouteQuery }
  | { name: "plus"; query: RouteQuery }
  | { name: "reset"; token: string; query: RouteQuery };

export function parseQuery(qs: string | undefined): RouteQuery {
  const out: RouteQuery = {};
  if (!qs) return out;
  const p = new URLSearchParams(qs);
  const slot = p.get("slot");
  if (slot) out.slot = slot;
  const note = p.get("note");
  if (note) out.note = note;
  const from = p.get("from");
  if (from === "today" || from === "admin" || from === "plus" || from === "rooms" || from === "schedule") {
    out.from = from;
  }
  return out;
}

export function parseHash(hash: string): Route {
  const raw = (hash || "").replace(/^#/, "") || "/";
  const qIndex = raw.indexOf("?");
  const path = qIndex === -1 ? raw : raw.slice(0, qIndex);
  const qs = qIndex === -1 ? "" : raw.slice(qIndex + 1);
  const query = parseQuery(qs);
  const parts = path.split("/").filter(Boolean);
  if (parts[0] === "reset" && parts[1]) return { name: "reset", token: parts[1], query };
  if (parts[0] === "a" && parts[1]) return { name: "detail", annId: parts[1], query };
  if (parts[0] === "publish") return { name: "publish", query };
  if (parts[0] === "rooms" && parts[1]) return { name: "chat", roomId: parts[1], query };
  if (parts[0] === "rooms") return { name: "rooms", query };
  if (parts[0] === "schedule") return { name: "schedule", query };
  if (parts[0] === "syllabus") return { name: "syllabus", query };
  if (parts[0] === "me") return { name: "profile", query };
  if (parts[0] === "grades") return { name: "grades", query };
  if (parts[0] === "admin") return { name: "admin", query };
  if (parts[0] === "plus") return { name: "plus", query };
  return { name: "today", query };
}

function queryString(q: RouteQuery): string {
  const p = new URLSearchParams();
  if (q.slot) p.set("slot", q.slot);
  if (q.note) p.set("note", q.note);
  if (q.from) p.set("from", q.from);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function toHash(r: Route): string {
  const q = queryString(r.query);
  switch (r.name) {
    case "detail":
      return `#/a/${r.annId}${q}`;
    case "publish":
      return `#/publish${q}`;
    case "rooms":
      return `#/rooms${q}`;
    case "chat":
      return `#/rooms/${r.roomId}${q}`;
    case "schedule":
      return `#/schedule${q}`;
    case "syllabus":
      return `#/syllabus${q}`;
    case "profile":
      return `#/me${q}`;
    case "grades":
      return `#/grades${q}`;
    case "admin":
      return `#/admin${q}`;
    case "plus":
      return `#/plus${q}`;
    case "reset":
      return `#/reset/${r.token}${q}`;
    default:
      return `#/${q}`;
  }
}

export function backFromDetail(route: Extract<Route, { name: "detail" }>): Route {
  switch (route.query.from) {
    case "admin":
      return { name: "admin", query: {} };
    case "plus":
      return { name: "plus", query: {} };
    case "schedule":
      return { name: "schedule", query: {} };
    default:
      return { name: "today", query: {} };
  }
}

export function routeTitle(route: Route, extra?: { announcementTitle?: string; urgent?: boolean; roomName?: string }): string {
  switch (route.name) {
    case "today":
      return "Aujourd’hui · 2late";
    case "detail": {
      const t = extra?.announcementTitle || "Annonce";
      return `${extra?.urgent ? "Urgente — " : ""}${t} · 2late`;
    }
    case "publish":
      return "Nouvelle annonce · 2late";
    case "rooms":
      return "Salons · 2late";
    case "chat":
      return `${extra?.roomName || "Salon"} · 2late`;
    case "schedule":
      return "Planning · 2late";
    case "syllabus":
      return "Syllabus · 2late";
    case "profile":
      return "Profil · 2late";
    case "grades":
      return "Mes notes · 2late";
    case "admin":
      return "Admin · 2late";
    case "plus":
      return "Plus · 2late";
    case "reset":
      return "Réinitialiser le mot de passe · 2late";
    default:
      return "2late — Annonces universitaires";
  }
}

export function activeTab(route: Route): "today" | "rooms" | "schedule" | "plus" | "profile" | "admin" | "syllabus" | "grades" {
  if (route.name === "admin") return "admin";
  if (route.name === "profile" || route.name === "grades") return route.name === "grades" ? "grades" : "profile";
  if (route.name === "rooms" || route.name === "chat") return "rooms";
  if (route.name === "schedule") return "schedule";
  if (route.name === "syllabus") return "syllabus";
  if (route.name === "plus") return "plus";
  if (route.name === "detail" && route.query.from === "admin") return "plus";
  if (route.name === "detail" && route.query.from === "plus") return "plus";
  return "today";
}
