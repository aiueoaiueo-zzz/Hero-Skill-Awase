import { useNavigate, useParams } from "react-router";
import { Header } from "../components/Header";
import { PROG, useBootFx } from "../lib/fx";
import { copyText } from "../lib/ui";

/** 5. 投稿完了 */
export function Done() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  useBootFx(true);
  return (
    <>
      <Header title="申請しました" back="/" prog={PROG.step3} />
      <div className="box" style={{ textAlign: "center" }}>
        <p>受付番号</p>
        <div className="code">{code}</div>
        <button className="sbtn" onClick={() => copyText(code, "コピーしました", "長押しでコピーしてください")}>
          コピー
        </button>
        <p style={{ marginTop: 12 }}>
          この番号で審査状況を確認できます。
          <br />
          このブラウザにも保存されています。
        </p>
      </div>
      <div className="links">
        <button onClick={() => nav("/status")}>審査状況を確認</button>
        <button onClick={() => nav("/")}>トップへ</button>
      </div>
    </>
  );
}
