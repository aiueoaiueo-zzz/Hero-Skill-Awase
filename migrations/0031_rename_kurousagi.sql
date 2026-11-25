-- 投稿者の X の ID の打ち間違いを直す（管理者の依頼。2026-11-25）
--   kurousag_5116 → kurousagi_5116
--   投稿・修正提案（submissions）のほか、投稿者情報の変更申請に残っている値と、ランキングの対象外の設定も同じく直す。
--   大文字・小文字の違いや、先頭の @・＠ が付いたまま保存されている古い値もまとめて直す。
UPDATE submissions SET nickname = 'kurousagi_5116'
  WHERE lower(ltrim(nickname, '@＠')) = 'kurousag_5116';
UPDATE poster_changes SET nickname = 'kurousagi_5116'
  WHERE lower(ltrim(nickname, '@＠')) = 'kurousag_5116';
UPDATE poster_change_items SET old_nickname = 'kurousagi_5116'
  WHERE lower(ltrim(old_nickname, '@＠')) = 'kurousag_5116';
UPDATE settings SET value = replace(replace(value, 'kurousag_5116', 'kurousagi_5116'), 'KUROUSAG_5116', 'kurousagi_5116')
  WHERE key = 'ranking_excluded';
