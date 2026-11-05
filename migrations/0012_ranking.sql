-- ランキング（docs/DECISIONS.md V）
-- 今週のボーナス組み合わせ：週（日本時間の月曜の日付）ごとに、その週の初めの時点でまだ公開中のタイミングがない組み合わせから 7 つをランダムに選んで保存する。
--   キャラを削除しても困らないよう、heroes への外部キーは付けない。
CREATE TABLE bonus_pairs (
  week        TEXT NOT NULL,
  attacker_id TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  PRIMARY KEY (week, attacker_id, target_id)
);
-- 投稿者（X の ID）ごとの集計用。X の ID は大文字・小文字を区別しない
CREATE INDEX idx_submissions_nickname_lower ON submissions(lower(nickname));
