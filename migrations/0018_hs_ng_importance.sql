-- ヒーロースキルが不可のキャラは、HS合わせ重要度を「−」（0）に固定する（docs/DECISIONS.md AB）。
-- 以後は管理画面で変更したときに API が同じように揃える。
UPDATE heroes SET hs_attack_importance = 0 WHERE (',' || ng_attacks || ',') LIKE '%,hs,%';
