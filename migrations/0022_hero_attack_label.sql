-- HS のダメージ発生に、どの場面の値かの補足を持たせる（docs/DECISIONS.md AH）。
--   hs_attack_label：例「2回目以降」。補足がなければ NULL
-- テスラは 2 回目以降の HS（2 個目以降のコイル）でダメージが出るため、その値（やぎシミュの「発生:3.1秒」）を使う。
ALTER TABLE heroes ADD COLUMN hs_attack_label TEXT;
UPDATE heroes SET hs_attack_label = '2回目以降' WHERE slug = 'hero-14';
