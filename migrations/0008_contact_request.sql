-- お問い合わせの種類に「ご要望（request）」を追加する。
-- SQLite は CHECK 制約を変更できないので、テーブルを作り直してデータを移す。
CREATE TABLE contacts_new (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('removal', 'mistake', 'bug', 'request', 'rights', 'other')),
  ref TEXT,
  body TEXT NOT NULL,
  reply_to TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done')),
  created_at TEXT NOT NULL,
  done_at TEXT
);
INSERT INTO contacts_new (id, kind, ref, body, reply_to, status, created_at, done_at)
  SELECT id, kind, ref, body, reply_to, status, created_at, done_at FROM contacts;
DROP TABLE contacts;
ALTER TABLE contacts_new RENAME TO contacts;
CREATE INDEX contacts_status_created ON contacts (status, created_at);
