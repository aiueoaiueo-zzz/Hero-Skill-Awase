-- 「今週のボーナス組み合わせ」は廃止（docs/DECISIONS.md V）。代わりに、その組み合わせで最初に承認された投稿に ＋0.5（集計時に計算するので表はいらない）
DROP TABLE IF EXISTS bonus_pairs;
