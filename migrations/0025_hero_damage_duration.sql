-- HS のダメージ継続時間（docs/DECISIONS.md AN）。極大ダメージまたは転倒が入る攻撃のみ入力する
--   hs_damage_duration：秒（0〜60）。-1 は「−」（入力したうえで、該当なし）。未入力は NULL
ALTER TABLE heroes ADD COLUMN hs_damage_duration REAL CHECK (hs_damage_duration IS NULL OR hs_damage_duration = -1 OR (hs_damage_duration >= 0 AND hs_damage_duration <= 60));
