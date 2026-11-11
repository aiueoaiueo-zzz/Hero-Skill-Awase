-- HS合わせ重要度（docs/DECISIONS.md AA）。HS に合わせる側（攻撃する側）として、そのキャラで合わせる重要さ。
--   hs_attack_importance：0〜3（3 が最も重要。0 は「−」＝対象外）。未入力は NULL
-- 攻撃する側のキャラ選択の「HS合わせ重要度順」に使う。
-- これまでの hs_importance（migration 0015）は「HS被合わせ重要度」（HS に合わせられる側としての重要さ）として、相手の選択の並び順に使う。
ALTER TABLE heroes ADD COLUMN hs_attack_importance INTEGER CHECK (hs_attack_importance IS NULL OR hs_attack_importance IN (0, 1, 2, 3));
