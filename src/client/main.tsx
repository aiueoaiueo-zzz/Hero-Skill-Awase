import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Hero = { id: string; name: string; slug: string };

function App() {
  const [heroes, setHeroes] = useState<Hero[] | null>(null);
  useEffect(() => {
    fetch("/api/heroes").then((r) => r.json()).then((d) => setHeroes(d.heroes));
  }, []);
  return (
    <>
      <header>
        <h1>HS明け早見アプリ<small>① 攻撃する側（自分）のキャラを選択</small></h1>
      </header>
      <div className="sec">初期構築の確認（D1 から取得）</div>
      <ul id="heroes">{heroes?.map((h) => <li key={h.id}>{h.name}（{h.slug}）</li>)}</ul>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
