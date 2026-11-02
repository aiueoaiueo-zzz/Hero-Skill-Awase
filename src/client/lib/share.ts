import { xShareUrl } from "../../shared/share";

/** X の投稿画面を開く（アプリが入っていればアプリで開く） */
export function shareToX(text: string, url: string) {
  window.open(xShareUrl(text, url), "_blank", "noopener,noreferrer");
}
