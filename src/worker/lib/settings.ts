import { DEFAULT_SETTINGS, SETTING_KEYS, type SettingKey } from "../../shared/constants";
import type { Env } from "../env";

export const getSettings = async (env: Env): Promise<Record<SettingKey, string>> => {
  const { results } = await env.DB.prepare("SELECT key, value FROM settings").all<{ key: string; value: string }>();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of results) if ((SETTING_KEYS as readonly string[]).includes(r.key)) out[r.key as SettingKey] = r.value;
  return out;
};
