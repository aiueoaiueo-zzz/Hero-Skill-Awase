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
      {/* 非公式であることを、邪魔にならない大きさで常に示す（管理画面では出さない） */}
      {!pathname.startsWith("/admin") && <span className="unofficial">非公式ファンツール</span>}
      {back !== undefined && (
        <button className="ibtn" aria-label="戻る" onClick={() => nav(back)}>
          ←
        </button>
      )}
      <button className="homeicon" aria-label="最初の画面へ" onClick={() => nav(pathname.startsWith("/admin") ? "/admin" : "/")}>
        <img src="/icon-192.png" alt="" width={36} height={36} />
      </button>
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
