import { nowIso } from "./ids";

/** 対象の投稿がなくなった審査待ちの投稿者情報の変更申請を、取り下げ扱いにする（申請から投稿を外したあと。docs/DECISIONS.md BC） */
export const closeEmptyPosterChanges = (db: D1Database, now = nowIso()) =>
  db
    .prepare(
      "UPDATE poster_changes SET status = 'withdrawn', reviewed_at = ? WHERE status = 'pending' AND NOT EXISTS (SELECT 1 FROM poster_change_items i WHERE i.change_id = poster_changes.id)",
    )
    .bind(now);
