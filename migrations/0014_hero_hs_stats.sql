-- キャラの HS の情報（docs/DECISIONS.md X）。管理画面のキャラ管理で入力する。未入力は NULL。
--   hs_type：HS のタイプ（attack：攻撃型／defense：防御型）
--   hs_attack_time：攻撃型の HS の、攻撃が発生するまでの時間（秒）
--   hs_invincible_time：HS の無敵時間（秒）
-- 相手を選ぶ画面・詳細画面で、「自分の HS の攻撃発生時間」と「相手の HS の無敵時間」を比べて、合わせられるかを表示する。
ALTER TABLE heroes ADD COLUMN hs_type TEXT CHECK (hs_type IS NULL OR hs_type IN ('attack', 'defense'));
ALTER TABLE heroes ADD COLUMN hs_attack_time REAL CHECK (hs_attack_time IS NULL OR (hs_attack_time >= 0 AND hs_attack_time <= 60));
ALTER TABLE heroes ADD COLUMN hs_invincible_time REAL CHECK (hs_invincible_time IS NULL OR (hs_invincible_time >= 0 AND hs_invincible_time <= 60));
