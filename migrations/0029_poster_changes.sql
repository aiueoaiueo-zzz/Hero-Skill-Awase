-- 投稿者情報（X の ID・応援コード）の変更申請（docs/DECISIONS.md BC）
--   公開中（承認済み）の投稿の X の ID・応援コードを、投稿したブラウザ（取り下げ用キー）から変更申請し、管理者が承認したら反映する。
--   1 回の申請で、このブラウザで投稿した複数の投稿をまとめて変えられる（poster_change_items に投稿ごとに 1 行）。
--   1 つの投稿が審査待ちの申請に入るのは 1 件まで（新しく申請すると、前の申請から外す）。
CREATE TABLE poster_changes (
  id            TEXT PRIMARY KEY,                    -- ULID
  nickname      TEXT,                                -- 新しい X の ID（NULL は「消す」）
  support_code  TEXT,                                -- 新しい応援コード（NULL は「消す」）
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  reject_reason TEXT CHECK (reject_reason IS NULL OR length(reject_reason) <= 500),
  created_at    TEXT NOT NULL,
  reviewed_at   TEXT
);
CREATE INDEX idx_poster_changes_status ON poster_changes(status, created_at);
CREATE TABLE poster_change_items (
  change_id        TEXT NOT NULL REFERENCES poster_changes(id),
  submission_id    TEXT NOT NULL REFERENCES submissions(id),
  old_nickname     TEXT,                             -- 申請した時点の値（管理画面の「変更前」）
  old_support_code TEXT,
  PRIMARY KEY (change_id, submission_id)
);
CREATE INDEX idx_poster_change_items_sub ON poster_change_items(submission_id);
