-- R2 に置いたファイルの台帳（仕様 8-2：使用量を D1 で記録する）
-- 追加・削除のたびに更新し、Cron で R2 の実際の一覧と照合する。
-- 動画のアップロード先を発行した時点で、宣言サイズで「予約」として記録する（アップロード前でも容量に数える）。
CREATE TABLE media_objects (
  key        TEXT PRIMARY KEY,                 -- pending/... public/... heroes/...
  size       INTEGER NOT NULL CHECK (size >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 既存データの取り込み（以降は Cron の照合で実際の値に合わせる）
INSERT OR IGNORE INTO media_objects (key, size, created_at, updated_at)
  SELECT video_key, MAX(COALESCE(video_size, 0)), MIN(updated_at), MIN(updated_at)
    FROM timings WHERE status IN ('pending', 'approved') GROUP BY video_key;
