-- HS の無敵時間が場面で変わるキャラ用に、場面ごとの無敵時間を持たせる（docs/DECISIONS.md AD）。
--   hs_invincible_detail：[{"label":"1,2回目","sec":1.3},{"label":"3回目","sec":5.5}] のような JSON。場面で変わらないキャラは NULL
--   hs_invincible_time は、場面ごとの値があるときは一番長い値を入れておく（一覧の確認用）
-- 合わせ不可の判定は場面ごとに行い、全部の場面で足りないときだけ HS を「合わせ不可」にする。
ALTER TABLE heroes ADD COLUMN hs_invincible_detail TEXT;
-- オーナー指定の 7 体（やぎシミュでは複数の値になっているもの）。管理画面で入力済みなら上書きしない
UPDATE heroes SET hs_invincible_detail = '[{"label":"1,2回目","sec":1.3},{"label":"3回目","sec":5.5}]', hs_invincible_time = 5.5 WHERE slug = 'hero-7' AND hs_invincible_time IS NULL;
UPDATE heroes SET hs_invincible_detail = '[{"label":"1回目","sec":1.5},{"label":"2回目以降","sec":5.5}]', hs_invincible_time = 5.5 WHERE slug = 'hero-14' AND hs_invincible_time IS NULL;
UPDATE heroes SET hs_invincible_detail = '[{"label":"1回目","sec":7},{"label":"2回目以降","sec":2.9}]', hs_invincible_time = 7 WHERE slug = 'hero-27' AND hs_invincible_time IS NULL;
UPDATE heroes SET hs_invincible_detail = '[{"label":"HS成功時","sec":9.2},{"label":"HS失敗時","sec":7}]', hs_invincible_time = 9.2 WHERE slug = 'hero-33' AND hs_invincible_time IS NULL;
UPDATE heroes SET hs_invincible_detail = '[{"label":"最短距離時","sec":4.7}]', hs_invincible_time = 4.7 WHERE slug = 'hero-38' AND hs_invincible_time IS NULL;
UPDATE heroes SET hs_invincible_detail = '[{"label":"1回目","sec":6},{"label":"2回目以降","sec":2}]', hs_invincible_time = 6 WHERE slug = 'hero-87' AND hs_invincible_time IS NULL;
UPDATE heroes SET hs_invincible_detail = '[{"label":"精霊1-5体目","sec":1.3},{"label":"精霊6体目","sec":8.9}]', hs_invincible_time = 8.9 WHERE slug = 'hero-95' AND hs_invincible_time IS NULL;
