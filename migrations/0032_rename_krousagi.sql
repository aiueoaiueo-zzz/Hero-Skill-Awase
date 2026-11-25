-- 投稿者の X の ID をさらに直す（管理者の依頼。2026-11-25）
--   0031 で kurousag_5116 → kurousagi_5116 にしたが、正しくは krousagi_5116 だった。
--   kurousagi_5116 と、念のため元の kurousag_5116 も、krousagi_5116 にする（0031 と同じ範囲）。
UPDATE submissions SET nickname = 'krousagi_5116'
  WHERE lower(ltrim(nickname, '@＠')) IN ('kurousagi_5116', 'kurousag_5116');
UPDATE poster_changes SET nickname = 'krousagi_5116'
  WHERE lower(ltrim(nickname, '@＠')) IN ('kurousagi_5116', 'kurousag_5116');
UPDATE poster_change_items SET old_nickname = 'krousagi_5116'
  WHERE lower(ltrim(old_nickname, '@＠')) IN ('kurousagi_5116', 'kurousag_5116');
UPDATE settings SET value = replace(replace(value, 'kurousagi_5116', 'krousagi_5116'), 'kurousag_5116', 'krousagi_5116')
  WHERE key = 'ranking_excluded';
