import { useState } from "react";
import { useNavigate } from "react-router";
import { heroMatches } from "../../shared/text";
import { Header } from "../components/Header";
import { HeroFilter, useHeroFilter } from "../components/HeroFilter";
import { HeroGrid } from "../components/HeroGrid";
import { EventBox } from "../components/EventBox";
import { RankBox } from "../components/RankBox";
import { useData } from "../lib/data";
import { PROG, useBootFx } from "../lib/fx";

/** 1. トップ（攻撃する側のキャラ選択） */
export function Home() {
  const nav = useNavigate();
  useBootFx(true);
  return (
    <>
      <Header title={<>HS合わせ<span className="brand">ヒロアプ</span></>} sub="① 攻撃する側（自分）のキャラを選択" prog={PROG.step1} />
      <EventBox />
      <RankBox />
      <AttackerPick base="/h" />
      <div className="links">
        <button onClick={() => nav("/submit")}>＋ 投稿する</button>
      </div>
    </>
  );
}

/** 攻撃する側のキャラの選択（検索・並び替え）。一般向けと管理画面の公開中タブで同じものを使う */
export function AttackerPick({ base }: { base: string }) {
  const { heroes } = useData();
  const [q, setQ] = useState("");
  const f = useHeroFilter("attack");
  const list = f.apply(heroes.filter((h) => heroMatches(h, q)));
  return (
    <>
      <input className="search" placeholder="キャラ名で検索" value={q} onChange={(e) => setQ(e.target.value)} />
      <HeroFilter {...f} />
      {list.length ? <HeroGrid heroes={list} to={(h) => `${base}/${h.slug}`} kind={f.kind} /> : <div className="empty">該当するキャラがいません</div>}
    </>
  );
}
