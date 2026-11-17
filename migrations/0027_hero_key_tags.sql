-- 重要タグ（docs/DECISIONS.md AT）。同じ ★ の中で上に並べる
--   hs_attack_key：HS合わせ適性の重要タグ（ヒーロースキルが不可のキャラは付けられない）
--   hs_target_key：HS警戒度の重要タグ
ALTER TABLE heroes ADD COLUMN hs_attack_key INTEGER NOT NULL DEFAULT 0 CHECK (hs_attack_key IN (0, 1));
ALTER TABLE heroes ADD COLUMN hs_target_key INTEGER NOT NULL DEFAULT 0 CHECK (hs_target_key IN (0, 1));
