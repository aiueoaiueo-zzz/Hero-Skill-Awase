-- HS のダメージ発生を、無敵時間と同じように複数のパターン（場面ごと）で持てるようにする（docs/DECISIONS.md AS）。
--   hs_attack_detail：[{"label":"1回目","sec":1.2},{"label":"2回目以降","sec":3.1}] の JSON。1 つだけのときは NULL
--   hs_attack_time / hs_attack_label：最初のパターンの値（判定・並び替えはこの値を使う）
ALTER TABLE heroes ADD COLUMN hs_attack_detail TEXT;
