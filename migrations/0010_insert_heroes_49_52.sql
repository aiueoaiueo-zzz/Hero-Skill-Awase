-- キャラの追加（docs/DECISIONS.md P）：hero-49〜hero-52 に 4 体を入れ、元の hero-49〜hero-100 を 4 つ後ろ（hero-53〜hero-104）にずらす。
--   対象は migration 0009 で入れたキャラ（ID の末尾の番号 = 入れたときの番号）。slug は重複できないので、いったん仮の slug にしてから付け直す。
UPDATE heroes SET slug = 'tmp-' || CAST(substr(id, 10) AS INTEGER)
 WHERE id LIKE '01JHEROES%' AND CAST(substr(id, 10) AS INTEGER) BETWEEN 49 AND 100;
UPDATE heroes SET slug = 'hero-' || (CAST(substr(id, 10) AS INTEGER) + 4), sort_order = CAST(substr(id, 10) AS INTEGER) + 4
 WHERE id LIKE '01JHEROES%' AND CAST(substr(id, 10) AS INTEGER) BETWEEN 49 AND 100;

INSERT INTO heroes (id, name, slug, image_key, sort_order, created_at) VALUES
  ('01JHEROES00000000000000101', 'アイズ', 'hero-49', NULL, 49, '2026-11-03T00:00:00.000Z'),
  ('01JHEROES00000000000000102', '甘色', 'hero-50', NULL, 50, '2026-11-03T00:00:00.000Z'),
  ('01JHEROES00000000000000103', 'ノクティス', 'hero-51', NULL, 51, '2026-11-03T00:00:00.000Z'),
  ('01JHEROES00000000000000104', 'ニーズヘッグ', 'hero-52', NULL, 52, '2026-11-03T00:00:00.000Z');
