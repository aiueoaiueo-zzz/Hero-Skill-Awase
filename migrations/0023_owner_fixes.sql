-- オーナー指定のデータの修正（docs/DECISIONS.md AJ）
-- ① ルチアーノ・Voidoll はヒーロースキルを「不可」に（HS合わせ適性は「−」に固定。AB と同じ）
UPDATE heroes
SET ng_attacks = CASE WHEN ng_attacks = '' THEN 'hs' ELSE 'hs,' || ng_attacks END, hs_attack_importance = 0
WHERE slug IN ('hero-8', 'hero-9') AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- ② デンジの HS合わせ適性を ★3 に
UPDATE heroes SET hs_attack_importance = 3 WHERE slug = 'hero-79' AND (',' || ng_attacks || ',') NOT LIKE '%,hs,%';
-- ③ 忠信の正式名称の打ち間違いを直す（忠臣 → 忠信）
UPDATE heroes SET full_name = '佐藤四郎兵衛忠信' WHERE slug = 'hero-48' AND full_name = '佐藤四郎兵衛忠臣';
