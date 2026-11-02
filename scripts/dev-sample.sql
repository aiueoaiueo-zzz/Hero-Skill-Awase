-- 開発用のサンプルデータ（ローカル専用。本番には入れない）
-- 使い方：npm run sample:local
DELETE FROM timings WHERE submission_id LIKE 'devsample-%';
DELETE FROM submissions WHERE id LIKE 'devsample-%';

-- 十文字アタリ → ジャンヌダルク（承認済み 4 件・承認待ち 1 件・却下 1 件）
INSERT INTO submissions (id, code, delete_key_hash, attacker_id, target_id, nickname, support_code, replaces_timing_id, created_at) VALUES
  ('devsample-s1', 'HS-SAMPL1', 'x', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', 'サンプル', 'A1B2C3D4', NULL, '2026-10-01T10:00:00.000Z'),
  ('devsample-s2', 'HS-SAMPL2', 'x', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', NULL, NULL, NULL, '2026-10-02T10:00:00.000Z'),
  ('devsample-s3', 'HS-SAMPL3', 'x', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', NULL, 'KMP7Q9XR', NULL, '2026-10-03T10:00:00.000Z'),
  ('devsample-s4', 'HS-SAMPL4', 'x', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000009', 'テスト投稿者', NULL, NULL, '2026-10-04T10:00:00.000Z'),
  ('devsample-s5', 'HS-SAMPL5', 'x', '01JSEEDHER0000000000000008', '01JSEEDHER0000000000000014', NULL, NULL, NULL, '2026-10-05T10:00:00.000Z');

INSERT INTO timings (id, submission_id, attacker_id, target_id, position, attack_type, cue_type, timing_text, note, video_key, video_size, status, reject_reason, reviewed_at, updated_at) VALUES
  ('devsample-t1', 'devsample-s1', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', 0, 'hs', 'voice', '「いくよー！」の「よ」に合わせる', 'ラグがあるので少し早めに押すのがコツ', 'public/demo.mp4', 2906, 'approved', NULL, '2026-10-02T09:00:00.000Z', '2026-10-02T09:00:00.000Z'),
  ('devsample-t2', 'devsample-s1', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', 1, 'hs', 'motion', '相手が武器を振り下ろし、地面に着いた瞬間', NULL, 'public/demo.mp4', 2906, 'approved', NULL, '2026-10-02T09:00:00.000Z', '2026-10-02T09:00:00.000Z'),
  ('devsample-t3', 'devsample-s2', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', 0, 'normal', 'time', '相手のHS発動から約2秒後', '<b>HTMLはそのまま文字で表示</b>
改行も反映される', 'public/demo.mp4', 2906, 'approved', NULL, '2026-10-03T09:00:00.000Z', '2026-10-03T09:00:00.000Z'),
  ('devsample-t4', 'devsample-s3', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', 0, 'hs', 'other', '相手のHSゲージが消えた瞬間', NULL, 'public/demo.mp4', 2906, 'approved', NULL, '2026-10-04T09:00:00.000Z', '2026-10-04T09:00:00.000Z'),
  ('devsample-t5', 'devsample-s3', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', 1, 'card', 'voice', '【承認待ち】表示されてはいけない', NULL, 'pending/x.mp4', 2906, 'pending', NULL, NULL, '2026-10-03T10:00:00.000Z'),
  ('devsample-t6', 'devsample-s2', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000002', 1, 'card', 'voice', '【却下】表示されてはいけない', NULL, 'pending/y.mp4', 2906, 'rejected', 'テスト', '2026-10-03T09:00:00.000Z', '2026-10-03T09:00:00.000Z'),
  -- 十文字アタリ → 深川まとい（ヒーローアクションのみ）
  ('devsample-t7', 'devsample-s4', '01JSEEDHER0000000000000001', '01JSEEDHER0000000000000009', 0, 'action', 'motion', 'カットインが閉じた直後', NULL, 'public/demo.mp4', 2906, 'approved', NULL, '2026-10-05T09:00:00.000Z', '2026-10-05T09:00:00.000Z'),
  -- Voidoll → 13†サーティーン†（承認待ちのみ：未登録のまま）
  ('devsample-t8', 'devsample-s5', '01JSEEDHER0000000000000008', '01JSEEDHER0000000000000014', 0, 'hs', 'voice', '【承認待ち】表示されてはいけない', NULL, 'pending/z.mp4', 2906, 'pending', NULL, NULL, '2026-10-05T10:00:00.000Z');
