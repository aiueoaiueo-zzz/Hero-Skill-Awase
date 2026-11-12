-- イベント（キャンペーン）と「今週のキャラ」のスケジュール（docs/DECISIONS.md AL）
-- 日付は日本時間の YYYY-MM-DD。開始日〜終了日の両端を含む
CREATE TABLE events (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
  starts_on  TEXT NOT NULL CHECK (starts_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  ends_on    TEXT NOT NULL CHECK (ends_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND ends_on >= starts_on),
  goal       INTEGER CHECK (goal IS NULL OR goal BETWEEN 1 AND 100000), -- 目標の組み合わせ数（任意）
  created_at TEXT NOT NULL
);
CREATE TABLE featured_heroes (
  id         TEXT PRIMARY KEY,
  hero_id    TEXT NOT NULL REFERENCES heroes(id) ON DELETE CASCADE,
  starts_on  TEXT NOT NULL CHECK (starts_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  ends_on    TEXT NOT NULL CHECK (ends_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND ends_on >= starts_on),
  created_at TEXT NOT NULL
);
CREATE INDEX idx_featured_heroes_dates ON featured_heroes (starts_on, ends_on);
