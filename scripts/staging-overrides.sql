-- 確認用サイト（staging）だけで使う、データの上書き（本番では使わない）
-- 本番のデータを入れ直したあとに流す。リリース記念イベントを「今、開催中」にして画面を確認するため
UPDATE events SET starts_on = '2026-11-20',
  badge_name = COALESCE(badge_name, 'リリース記念イベント'),
  tier_low = COALESCE(tier_low, 1), tier_mid = COALESCE(tier_mid, 5), tier_high = COALESCE(tier_high, 15)
 WHERE name LIKE 'リリース記念%';
-- 最初の週の今週のキャラも、今日から出るように前にずらす
UPDATE featured_heroes SET starts_on = '2026-11-20' WHERE starts_on = '2026-11-27';
