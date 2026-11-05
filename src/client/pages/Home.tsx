import { useState } from "react";
import { useNavigate } from "react-router";
import { heroMatches } from "../../shared/text";
import { Header } from "../components/Header";
import { HeroGrid } from "../components/HeroGrid";
import { RankBox } from "../components/RankBox";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";

/** 1. トップ（攻撃する側のキャラ選択） */
export function Home() {
  const { heroes, bonus } = useData();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const list = heroes.filter((h) => heroMatches(h, q));
  useBootFx(true);
  return (
    <>
      <Header title={<>HS合わせ<span className="brand">ヒロアプ</span></>} sub="① 攻撃する側（自分）のキャラを選択" prog={PROG.step1} />
      <RankBox />
      <input className="search" placeholder="キャラ名で検索" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length ? (
        <HeroGrid heroes={list} to={(h) => `/h/${h.slug}`} marks={new Set(Object.keys(bonus))} />
      ) : (
        <div className="empty">該当するキャラがいません</div>
      )}
      <div className="links">
        <button onClick={() => nav("/submit")}>＋ 投稿する</button>
      </div>
    </>
  );
}
