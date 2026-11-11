-- キャラのロールと HS合わせ重要度（docs/DECISIONS.md Y）。管理画面のキャラ管理で入力する。未入力は NULL。
--   role：ロール（attacker：アタッカー／gunner：ガンナー／sprinter：スプリンター／tank：タンク）
--   hs_importance：HS合わせ重要度（1〜3。星が多いほど重要）
-- キャラ選択の画面で、ロールでの絞り込みと、重要度順での並べ替えに使う。
ALTER TABLE heroes ADD COLUMN role TEXT CHECK (role IS NULL OR role IN ('attacker', 'gunner', 'sprinter', 'tank'));
ALTER TABLE heroes ADD COLUMN hs_importance INTEGER CHECK (hs_importance IS NULL OR hs_importance IN (1, 2, 3));
