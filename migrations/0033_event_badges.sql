-- イベントのバッジ（docs/DECISIONS.md BM）
-- badge_name：バッジの名前の頭（例：リリース記念イベント → 「リリース記念イベント1位」「リリース記念イベント 上」）
-- tier_*：上・中・下になるイベントの合わせポイント（以上）。finalized_at：バッジを確定した時刻
ALTER TABLE events ADD COLUMN badge_name TEXT CHECK (badge_name IS NULL OR length(badge_name) BETWEEN 1 AND 20);
ALTER TABLE events ADD COLUMN tier_low REAL;
ALTER TABLE events ADD COLUMN tier_mid REAL;
ALTER TABLE events ADD COLUMN tier_high REAL;
ALTER TABLE events ADD COLUMN finalized_at TEXT;
-- 確定したバッジ（1 イベントに 1 人 1 つ。1〜3 位は順位のバッジ、それ以外は上・中・下）
CREATE TABLE event_badges (
  event_id   TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  x_id       TEXT NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('rank1', 'rank2', 'rank3', 'high', 'mid', 'low')),
  points     REAL NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (event_id, x_id)
);
CREATE INDEX idx_event_badges_x ON event_badges (x_id);
