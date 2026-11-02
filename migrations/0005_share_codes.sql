-- 共有用の短いコード（/s/<コード> で、そのタイミングの詳細画面へ移動する）
-- 承認したときに発行する。既存の承認済みタイミングは、最初に表示されたときに発行する。
ALTER TABLE timings ADD COLUMN share_code TEXT;
CREATE UNIQUE INDEX idx_timings_share_code ON timings(share_code) WHERE share_code IS NOT NULL;
