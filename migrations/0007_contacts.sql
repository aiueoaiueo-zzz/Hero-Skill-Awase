-- お問い合わせ（/contact）。管理画面の「お問い合わせ」タブで確認する。
--   status：open（未対応）／done（対応済み）。対応済みにしてから 90 日たったものは、毎日の自動処理で削除する。
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('removal', 'mistake', 'bug', 'rights', 'other')),
  ref TEXT,
  body TEXT NOT NULL,
  reply_to TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at TEXT NOT NULL,
  done_at TEXT
);
CREATE INDEX contacts_status_created ON contacts (status, created_at);
