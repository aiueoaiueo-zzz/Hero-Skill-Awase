-- キャラの攻撃方法ごとの「合わせ可／不可」（docs/DECISIONS.md Z）。
--   ng_attacks：合わせ不可の攻撃方法をカンマ区切り（hs,normal,action,card のうち。空なら全部可）
-- 不可の攻撃方法は、詳細画面のタブをグレーにして選べなくし、投稿でも選べない。
-- HS のタイプ（hs_type、migration 0014）は使わなくなった。防御型だったキャラは「ヒーロースキル：不可」に移す（列は残す）。
ALTER TABLE heroes ADD COLUMN ng_attacks TEXT NOT NULL DEFAULT '';
UPDATE heroes SET ng_attacks = 'hs' WHERE hs_type = 'defense';
