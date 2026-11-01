import type { Hero } from "../../shared/types";
import type { Env } from "../env";
import { mediaUrl } from "./media";

export type HeroRow = { id: string; name: string; slug: string; image_key: string | null; sort_order: number };

export const toHero = (env: Env, r: HeroRow): Hero => ({
  id: r.id,
  name: r.name,
  slug: r.slug,
  imageUrl: mediaUrl(env, r.image_key),
});

export const listHeroes = async (env: Env): Promise<Hero[]> => {
  const { results } = await env.DB.prepare(
    "SELECT id, name, slug, image_key, sort_order FROM heroes ORDER BY sort_order, created_at",
  ).all<HeroRow>();
  return results.map((r) => toHero(env, r));
};

export const heroBySlug = async (env: Env, slug: string): Promise<Hero | null> => {
  const r = await env.DB.prepare("SELECT id, name, slug, image_key, sort_order FROM heroes WHERE slug = ?")
    .bind(slug)
    .first<HeroRow>();
  return r ? toHero(env, r) : null;
};
