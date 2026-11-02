-- 動画アップロードの受付記録（仕様 6-2）
-- POST /api/uploads で発行した video_key を記録し、POST /api/entries で「このアプリが発行したキーか」を確認する。
-- ticket は Turnstile を通過した 1 回のアップロード要求ごとの ID（同じ投稿の登録に使う）。
CREATE TABLE uploads (
  video_key     TEXT PRIMARY KEY,                   -- pending/<ULID>.mp4
  ticket        TEXT NOT NULL,
  declared_size INTEGER NOT NULL CHECK (declared_size > 0),
  content_type  TEXT NOT NULL CHECK (content_type = 'video/mp4'),
  created_at    TEXT NOT NULL,
  used_at       TEXT                                -- エントリ登録に使われた日時
);
CREATE INDEX idx_uploads_ticket ON uploads(ticket);
CREATE INDEX idx_uploads_created ON uploads(created_at);
