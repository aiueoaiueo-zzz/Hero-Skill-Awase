import { Header } from "../components/Header";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";
import { mdLite } from "../lib/ui";

/** 注意事項・プライバシー（文面は管理画面の「設定」で変更できる） */
export function Terms() {
  const { settings } = useData();
  useBootFx(true);
  return (
    <>
      <Header title="注意事項" sub="プライバシーについても記載" back="/" prog={PROG.other} />
      <div className="about" dangerouslySetInnerHTML={{ __html: mdLite(settings.terms) }} />
    </>
  );
}
