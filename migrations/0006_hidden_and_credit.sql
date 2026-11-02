-- 管理者による非公開（公開中のタイミングを一時的に隠す。公開に戻せる）
--   hidden = 1 のタイミングは一般向けには出さない。動画は pending/ に移して /media からも見えなくする。
ALTER TABLE timings ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1));

-- 表示する投稿者（ニックネーム・応援コード）の投稿。
--   通常は NULL（そのタイミングを投稿した submission）。修正提案を承認したときは、修正した人の submission を指す。
ALTER TABLE timings ADD COLUMN credit_submission_id TEXT REFERENCES submissions(id);
