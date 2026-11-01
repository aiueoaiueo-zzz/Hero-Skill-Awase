-- 初期データ（仕様書 9 章）。キャラ名の一覧はオーナーが用意するまで仮のキャラを 3 体入れておく。
INSERT OR IGNORE INTO heroes (id, name, slug, image_key, sort_order, created_at) VALUES
  ('01JSEED0000000000000000001', '仮キャラA', 'sample-a', NULL, 1, '2026-11-01T00:00:00.000Z'),
  ('01JSEED0000000000000000002', '仮キャラB', 'sample-b', NULL, 2, '2026-11-01T00:00:00.000Z'),
  ('01JSEED0000000000000000003', '仮キャラC', 'sample-c', NULL, 3, '2026-11-01T00:00:00.000Z');
