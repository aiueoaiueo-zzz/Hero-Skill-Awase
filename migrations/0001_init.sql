-- HS明け早見アプリ 初期スキーマ（仕様書 7 章）

CREATE TABLE heroes (
  id         TEXT PRIMARY KEY,                       -- ULID
  name       TEXT NOT NULL UNIQUE CHECK (length(name) BETWEEN 1 AND 40),
  slug       TEXT NOT NULL UNIQUE CHECK (slug GLOB '[a-z0-9]*' AND slug NOT GLOB '*[^a-z0-9-]*' AND length(slug) BETWEEN 1 AND 40),
  image_key  TEXT,                                   -- heroes/...
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_heroes_sort ON heroes(sort_order);

-- 1 回の投稿 = 1 行
CREATE TABLE submissions (
  id                 TEXT PRIMARY KEY,               -- ULID
  code               TEXT NOT NULL UNIQUE CHECK (length(code) = 9 AND substr(code, 1, 3) = 'HS-' AND substr(code, 4) NOT GLOB '*[^A-Z0-9]*'),
  delete_key_hash    TEXT NOT NULL,                  -- SHA-256（hex）
  attacker_id        TEXT NOT NULL REFERENCES heroes(id),
  target_id          TEXT NOT NULL REFERENCES heroes(id),
  nickname           TEXT CHECK (nickname IS NULL OR length(nickname) <= 20),
  support_code       TEXT CHECK (support_code IS NULL OR length(support_code) <= 20),
  replaces_timing_id TEXT REFERENCES timings(id),    -- 修正提案のときのみ
  created_at         TEXT NOT NULL
);
CREATE INDEX idx_submissions_code ON submissions(code);

-- 合わせタイミング 1 つ = 1 行（審査もこの単位）
CREATE TABLE timings (
  id            TEXT PRIMARY KEY,                    -- ULID
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  attacker_id   TEXT NOT NULL REFERENCES heroes(id),
  target_id     TEXT NOT NULL REFERENCES heroes(id),
  position      INTEGER NOT NULL CHECK (position BETWEEN 0 AND 19),
  attack_type   TEXT NOT NULL CHECK (attack_type IN ('hs','normal','action','card','other')),
  cue_type      TEXT NOT NULL CHECK (cue_type IN ('voice','motion','time','other')),
  timing_text   TEXT NOT NULL CHECK (length(timing_text) BETWEEN 1 AND 200),
  note          TEXT CHECK (note IS NULL OR length(note) <= 1000),
  video_key     TEXT NOT NULL,
  video_size    INTEGER,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','withdrawn','merged')),
  reject_reason TEXT CHECK (reject_reason IS NULL OR length(reject_reason) <= 500),
  reviewed_at   TEXT,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_timings_pair ON timings(attacker_id, target_id, status, attack_type);
CREATE INDEX idx_timings_status_sub ON timings(status, submission_id);

-- 設定値（制作者の応援コード・注意事項・このアプリについて）
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
