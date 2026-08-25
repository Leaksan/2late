// Construit avec VITE_ADMIN=1 : bundle « interface d'administration »
// (connexion via /api/admin/login, réservée aux comptes ADMIN).
// Sans le flag : site applicatif classique — l'admin n'y est plus accessible.
export const ADMIN_BUILD = import.meta.env.VITE_ADMIN === "1";
