-- キャラの正式名称（任意）。カードには短い名前（name）を出し、カードの下・キャラ選択・検索には正式名称を使う。
--   未設定（NULL）のときは name をそのまま使う。管理画面のキャラ管理で入力する。
ALTER TABLE heroes ADD COLUMN full_name TEXT CHECK (full_name IS NULL OR length(full_name) BETWEEN 1 AND 60);
