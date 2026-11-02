import type { Env } from "../env";

/** この Worker の役割："public"（一般向け）／"admin"（管理用）／"all"（ローカル開発：両方）。未設定は "all" */
export const appRole = (env: Env) => (env.APP_ROLE === "public" || env.APP_ROLE === "admin" ? env.APP_ROLE : "all");

export const isAdminPath = (p: string) => p === "/admin" || p.startsWith("/admin/") || p === "/api/admin" || p.startsWith("/api/admin/");
