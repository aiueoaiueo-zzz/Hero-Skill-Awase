import { useRef, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router";
import { useProgress } from "../lib/fx";

type Props = { title: ReactNode; sub?: ReactNode; back?: string; right?: ReactNode; prog: number };

export function Header({ title, sub, back, right, prog }: Props) {
  const ref = useRef<HTMLElement>(null);
  const nav = useNavigate();
  const { pathname } = useLocation();
  useProgress(ref, prog);
  const hideAbout = pathname === "/about" || pathname.startsWith("/admin");
  return (
    <header ref={ref}>
      {back !== undefined && (
        <button className="ibtn" aria-label="戻る" onClick={() => nav(back)}>
          ←
        </button>
      )}
      <h1>
        {title}
        {sub && <small>{sub}</small>}
      </h1>
      {right}
      {!hideAbout && (
        <button className="ibtn infob" aria-label="このアプリについて" onClick={() => nav("/about")}>
          ⓘ 概要
        </button>
      )}
    </header>
  );
}
