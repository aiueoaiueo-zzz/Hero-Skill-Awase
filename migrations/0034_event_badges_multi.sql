-- イベントのバッジ：1 人が 1 つのイベントで「順位のバッジ」と「合わせ賞」の両方を持てるようにする（docs/DECISIONS.md BM）
-- 合わせ賞は期間中に達成したらすぐ（投稿者ページに出す）、順位のバッジは終了後に確定する
CREATE TABLE event_badges_new (
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  x_id       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('rank1', 'rank2', 'rank3', 'high', 'mid', 'low')),
  points     REAL NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_id, x_id, kind)
);
INSERT INTO event_badges_new (event_id, x_id, kind, points, created_at) SELECT event_id, x_id, kind, points, created_at FROM event_badges;
DROP TABLE event_badges;
ALTER TABLE event_badges_new RENAME TO event_badges;
CREATE INDEX idx_event_badges_x ON event_badges (x_id);
