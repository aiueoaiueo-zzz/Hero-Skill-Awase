import { Header } from "../components/Header";
import { PROG, useBootFx } from "../lib/fx";

/** まだ実装していない画面（実装ステップが進むと置き換える） */
export function Placeholder({ title, step }: { title: string; step: number }) {
  useBootFx(true);
  return (
    <>
      <Header title={title} back="/" prog={PROG.other} />
      <div className="empty">この画面は実装ステップ {step} で作ります</div>
    </>
  );
}
