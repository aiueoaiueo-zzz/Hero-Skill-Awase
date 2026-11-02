import { Link } from "react-router";
import { useData } from "../lib/data";
import { inlineMd } from "../lib/ui";
import { SupportCodeButton } from "./SupportCode";

/** 全画面共通のフッター（管理画面では表示しない） */
export function Footer() {
  const { settings } = useData();
  const oc = settings.owner_support_code.trim();
  const items = settings.notices
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  return (
    <footer className="sitefoot">
      <div className="own">
        <span>制作者の応援コード</span>
        {oc ? <SupportCodeButton code={oc} big /> : <b>（未設定）</b>}
      </div>
      <ul>
        {items.map((t, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inlineMd(t) }} />
        ))}
      </ul>
      <nav className="flinks">
        <Link to="/terms">注意事項・プライバシー</Link>
        <Link to="/contact">お問い合わせ・ご要望</Link>
      </nav>
      <div className="rights">©NHN PlayArt Corp. ©DWANGO Co., Ltd.</div>
      <div className="copy">HS明け早見アプリ（非公式ファンツール）</div>
    </footer>
  );
}
