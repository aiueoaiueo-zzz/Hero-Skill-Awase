import { HERO_ROLES, NG_ATTACK_TYPES, type HeroRole, type NgAttackType } from "../../shared/constants";
import type { Hero } from "../../shared/types";
import type { Env } from "../env";
import { mediaUrl } from "./media";
import { appRole } from "./role";

export type HeroRow = {
  id: string;
  name: string;
  full_name?: string | null;
  slug: string;
  image_key: string | null;
  sort_order: number;
  ng_attacks?: string | null;
  hs_attack_time?: number | null;
  hs_invincible_time?: number | null;
  role?: string | null;
  hs_importance?: number | null;
  hs_attack_importance?: number | null;
};

/** 「hs,card」→ ["hs", "card"]（知らない値は捨てる） */
export const parseNgAttacks = (s: string | null | undefined): NgAttackType[] =>
  NG_ATTACK_TYPES.filter((k) => (s || "").split(",").includes(k));

export const toHero = (env: Env, r: HeroRow): Hero => ({
  id: r.id,
  name: r.name,
  fullName: r.full_name || null,
  slug: r.slug,
  ngAttacks: parseNgAttacks(r.ng_attacks),
  hsAttackTime: r.hs_attack_time ?? null,
  hsInvincibleTime: r.hs_invincible_time ?? null,
  role: HERO_ROLES.some(([k]) => k === r.role) ? (r.role as HeroRole) : null,
  hsAttackImportance: [0, 1, 2, 3].includes(r.hs_attack_importance ?? -1) ? (r.hs_attack_importance as 0 | 1 | 2 | 3) : null,
  hsTargetImportance: r.hs_importance === 1 || r.hs_importance === 2 || r.hs_importance === 3 ? r.hs_importance : null,
  // 一般向けにはキャラ画像を出さない（権利への配慮。画面ではキャラ名のカードを使う）。管理画面だけ画像を確認できる
  imageUrl: appRole(env) === "public" ? null : mediaUrl(env, r.image_key),
});

export const listHeroes = async (env: Env): Promise<Hero[]> => {
  const { results } = await env.DB.prepare(
    "SELECT id, name, full_name, slug, image_key, sort_order, ng_attacks, hs_attack_time, hs_invincible_time, role, hs_importance, hs_attack_importance FROM heroes ORDER BY sort_order, created_at",
  ).all<HeroRow>();
  return results.map((r) => toHero(env, r));
};

export const heroBySlug = async (env: Env, slug: string): Promise<Hero | null> => {
  const r = await env.DB.prepare("SELECT id, name, full_name, slug, image_key, sort_order, ng_attacks, hs_attack_time, hs_invincible_time, role, hs_importance, hs_attack_importance FROM heroes WHERE slug = ?")
    .bind(slug)
    .first<HeroRow>();
  return r ? toHero(env, r) : null;
};
