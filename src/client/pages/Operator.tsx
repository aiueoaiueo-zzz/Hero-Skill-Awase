import { Link } from "react-router";
import { Header } from "../components/Header";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";
import { mdLite } from "../lib/ui";

/** 運営者情報（文面は管理画面の「設定」で変更できる。docs/DECISIONS.md BR） */
export function Operator() {
  const { settings } = useData();
  useBootFx(true);
  const name = settings.operator_name.trim();
  const x = settings.operator_x.trim().replace(/^[@＠]+/, "");
  return (
    <>
      <Header title="運営者情報" back="/" prog={PROG.other} />
      <div className="opcard">
        <dl>
          <dt>運営者</dt>
          <dd>{name || "（未設定）"}</dd>
          {x && (
            <>
              <dt>X</dt>
              <dd>
                <a href={`https://x.com/${encodeURIComponent(x)}`} target="_blank" rel="noopener noreferrer">
                  @{x} ↗
                </a>
              </dd>
            </>
          )}
          <dt>お問い合わせ</dt>
          <dd>
            <Link to="/contact">お問い合わせフォーム</Link>
          </dd>
        </dl>
      </div>
      <div className="about" dangerouslySetInnerHTML={{ __html: mdLite(settings.operator) }} />
    </>
  );
}
