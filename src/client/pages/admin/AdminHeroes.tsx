import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AdminHero } from "../../../shared/types";
import { ATTACK_LABEL, HERO_ROLES, NG_ATTACK_TYPES } from "../../../shared/constants";
import { Avatar } from "../../components/Avatar";
import { api, ApiError, useApi } from "../../lib/api";
import { useData } from "../../lib/data";
import { useBootFx } from "../../lib/fx";
import { toast } from "../../lib/ui";
import { AdminLayout, adminErrorMessage } from "./AdminLayout";

const ERRORS: Record<string, string> = {
  duplicate_name: "同じ名前のキャラがすでにいます",
  duplicate_slug: "同じ slug のキャラがすでにいます",
  invalid_type: "画像の形式に対応していません",
  invalid_size: "画像が大きすぎます",
};
const errMsg = (e: unknown) =>
  e instanceof ApiError ? (ERRORS[e.message] ?? (e.status === 400 ? "入力内容を確認してください（slug は英小文字・数字・ハイフン）" : "操作に失敗しました")) : "操作に失敗しました";

/** 1 回目で確認の表示に変わり、2.5 秒以内にもう一度押すと実行（試作版 armed） */
export function ArmedButton({ className, label, armedLabel, onConfirm, ...rest }: { className: string; label: ReactNode; armedLabel: string; onConfirm: () => void; "aria-label"?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 2500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      className={`${className} ${armed ? "armed" : ""}`}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
      {...rest}
    >
      {armed ? armedLabel : label}
    </button>
  );
}

/** その場で編集して、フォーカスが外れたら保存する入力欄 */
function InlineInput({ value, onCommit, style, allowEmpty, ...rest }: { value: string; onCommit: (v: string) => Promise<boolean>; style?: React.CSSProperties; allowEmpty?: boolean; "aria-label": string; placeholder?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      style={style}
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      onBlur={async () => {
        const t = v.trim();
        if (t === value) return setV(value);
        if ((!t && !allowEmpty) || !(await onCommit(t))) setV(value);
      }}
      {...rest}
    />
  );
}

/** 8. 管理：キャラ管理 */
export function AdminHeroes() {
  const pending = useApi<{ groups: { timings: unknown[] }[] }>("/api/admin/pending");
  const { reload } = useData();
  const [heroes, setHeroes] = useState<AdminHero[] | null>(null);
  const [error, setError] = useState<number | null>(null);
  const [bulk, setBulk] = useState("");
  const rows = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    api<{ heroes: AdminHero[] }>("/api/admin/heroes").then(
      (r) => setHeroes(r.heroes),
      (e) => setError(e instanceof ApiError ? e.status : 0),
    );
  }, []);
  useBootFx(!!heroes || error !== null);

  /** 操作して一覧を更新し、トップなどの表示にもすぐ反映する */
  const run = async (fn: () => Promise<{ heroes: AdminHero[] }>, msg?: string) => {
    try {
      const r = await fn();
      setHeroes(r.heroes);
      await reload();
      if (msg) toast(msg);
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    }
  };
  const call = (url: string, method: string, body?: unknown) => () =>
    api<{ heroes: AdminHero[] }>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

  const move = async (h: AdminHero, dir: -1 | 1) => {
    await run(call(`/api/admin/heroes/${h.id}/move`, "POST", { dir }));
    requestAnimationFrame(() => rows.current.get(h.id)?.scrollIntoView({ block: "center" }));
  };
  const add = async () => {
    const items = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const m = l.match(/^(.+?)\s*[,，、\t]\s*([a-z0-9][a-z0-9-]*)$/);
        return m ? { name: m[1].trim(), slug: m[2] } : { name: l };
      });
    if (!items.length) return toast("追加するキャラがありません");
    try {
      const r = await api<{ added: number; skipped: string[]; heroes: AdminHero[] }>("/api/admin/heroes", { method: "POST", body: JSON.stringify({ items }) });
      setHeroes(r.heroes);
      await reload();
      toast(r.added ? `${r.added}キャラ追加しました` : "追加するキャラがありません（同じ名前は追加しません）");
      if (r.added) setBulk("");
    } catch (e) {
      toast(errMsg(e));
    }
  };

  return (
    <AdminLayout tab="heroes" pendingCount={pending.data?.groups.reduce((s, g) => s + g.timings.length, 0)}>
      {error !== null && <div className="empty">{adminErrorMessage(error)}</div>}
      {heroes && (
        <>
          <div className="box">
            <p>
              名前（カードに出す短い名前）・正式名称・slug（URL 用の英数字）はタップで直接編集できます。
              <br />
              正式名称（任意）は、カードの下・キャラを選ぶ画面に表示され、検索でも当たるようになります。空にすると未設定に戻ります。
              <br />
              攻撃方法（ヒーロースキル・通常攻撃・ヒーローアクション・スキルカード）ごとに、そのキャラで合わせられるかを「可／不可」で選びます。不可にすると、詳細画面のそのタブがグレーになって選べなくなり、投稿でも選べなくなります。
              <br />
              HS の攻撃発生（秒）と無敵時間（秒）を入れると、相手の無敵時間が自分の攻撃発生より短い組み合わせも、HS が「合わせ不可」になります（ヒーロースキルが「不可」のキャラは攻撃発生を入力できません）。
              <br />
              ロールと HS合わせ重要度（★1〜3）は、キャラを選ぶ画面の「ロールで絞り込み」と「重要度順」の並べ替えに使います。
              <br />
              ▲▼で並び順を入れ替えられます（トップ画面などの表示順になります）。キャラ画像は一般向けの画面には表示されません。
            </p>
          </div>
          {heroes.map((h, i) => (
            <div
              className="toggle"
              key={h.id}
              ref={(el) => {
                if (el) rows.current.set(h.id, el);
                else rows.current.delete(h.id);
              }}
            >
              {/* キャラ画像は権利への配慮で使わないため、追加はできない（登録済みの画像は「画像を削除」で外せる） */}
              <div className="img">
                <Avatar hero={h} showImage />
              </div>
              <div className="nm">
                <InlineInput aria-label="名前" value={h.name} onCommit={(v) => run(call(`/api/admin/heroes/${h.id}`, "PATCH", { name: v }), "保存しました")} />
                <InlineInput
                  aria-label="正式名称"
                  allowEmpty
                  value={h.fullName ?? ""}
                  placeholder="正式名称（任意）"
                  style={{ fontSize: 12, padding: "0 0 2px" }}
                  onCommit={(v) => run(call(`/api/admin/heroes/${h.id}`, "PATCH", { fullName: v }), v ? "正式名称を保存しました" : "正式名称を消しました")}
                />
                <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: "var(--sub)" }}>
                  /h/
                  <InlineInput
                    aria-label="slug"
                    value={h.slug}
                    style={{ fontSize: 11, color: "var(--sub)", padding: "0 0 2px" }}
                    onCommit={(v) => run(call(`/api/admin/heroes/${h.id}`, "PATCH", { slug: v }), "保存しました")}
                  />
                </div>
                <HsEditor h={h} save={(patch, msg) => run(call(`/api/admin/heroes/${h.id}`, "PATCH", patch), msg)} />
              </div>
              {h.imageUrl && (
                <ArmedButton
                  className="sbtn imgdel"
                  label="画像を削除"
                  armedLabel="削除する"
                  onConfirm={() => run(call(`/api/admin/heroes/${h.id}/image`, "DELETE"), "画像を削除しました")}
                />
              )}
              <span className="ord">
                <button className="sbtn" disabled={i === 0} aria-label="上へ" onClick={() => move(h, -1)}>
                  ▲
                </button>
                <button className="sbtn" disabled={i === heroes.length - 1} aria-label="下へ" onClick={() => move(h, 1)}>
                  ▼
                </button>
              </span>
              <ArmedButton
                className="sbtn danger"
                label="削除"
                armedLabel={h.timingCount ? `投稿${h.timingCount}件も削除・確定` : "確定"}
                onConfirm={() => run(call(`/api/admin/heroes/${h.id}`, "DELETE"), "削除しました")}
              />
            </div>
          ))}
          <div className="box" style={{ marginTop: 14 }}>
            <p>
              キャラを追加（1行に1キャラ、まとめて貼り付けOK）
              <br />
              「キャラ名, slug」の形で slug も指定できます（省略すると仮の slug を付けます）。
            </p>
            <textarea placeholder={"キャラ名, slug\nキャラ名"} value={bulk} onChange={(e) => setBulk(e.target.value)} />
            <div className="btns">
              <button className="primary" onClick={add}>
                追加
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}

/** 攻撃方法ごとの合わせ可／不可・HS の攻撃発生・無敵時間・ロール・HS合わせ重要度。変えたらすぐ保存 */
function HsEditor({ h, save }: { h: AdminHero; save: (patch: Record<string, unknown>, msg: string) => Promise<boolean> }) {
  return (
    <div className="hsed">
      {NG_ATTACK_TYPES.map((k) => (
        <label key={k} className="hsf">
          {ATTACK_LABEL[k]}
          <select
            aria-label={`${ATTACK_LABEL[k]}での合わせ`}
            className={h.ngAttacks.includes(k) ? "ng" : ""}
            value={h.ngAttacks.includes(k) ? "ng" : "ok"}
            onChange={(e) =>
              save(
                { ngAttacks: e.target.value === "ng" ? [...h.ngAttacks, k] : h.ngAttacks.filter((x) => x !== k) },
                `${ATTACK_LABEL[k]}を「${e.target.value === "ng" ? "不可" : "可"}」にしました`,
              )
            }
          >
            <option value="ok">可</option>
            <option value="ng">不可</option>
          </select>
        </label>
      ))}
      <SecInput label="攻撃発生" value={h.hsAttackTime} disabled={h.ngAttacks.includes("hs")} onCommit={(v) => save({ hsAttackTime: v }, "攻撃発生時間を保存しました")} />
      <SecInput label="無敵" value={h.hsInvincibleTime} onCommit={(v) => save({ hsInvincibleTime: v }, "無敵時間を保存しました")} />
      <select aria-label="ロール" value={h.role ?? ""} onChange={(e) => save({ role: e.target.value || null }, "ロールを保存しました")}>
        <option value="">ロール：未入力</option>
        {HERO_ROLES.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
      <select
        aria-label="HS合わせ重要度"
        value={h.hsImportance ?? ""}
        onChange={(e) => save({ hsImportance: e.target.value ? Number(e.target.value) : null }, "HS合わせ重要度を保存しました")}
      >
        <option value="">重要度：未入力</option>
        <option value="3">★★★</option>
        <option value="2">★★☆</option>
        <option value="1">★☆☆</option>
      </select>
    </div>
  );
}

/** 秒の入力欄（空にすると未入力に戻す。フォーカスが外れたら保存） */
function SecInput({ label, value, disabled, onCommit }: { label: string; value: number | null; disabled?: boolean; onCommit: (v: number | null) => Promise<boolean> }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => setV(value == null ? "" : String(value)), [value]);
  return (
    <label className={`hsf ${disabled ? "off" : ""}`}>
      {label}
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        max="60"
        value={v}
        disabled={disabled}
        placeholder="—"
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        onBlur={async () => {
          const t = v.trim();
          const n = t === "" ? null : Number(t);
          if (n === value) return;
          if (n !== null && (!Number.isFinite(n) || n < 0 || n > 60)) return setV(value == null ? "" : String(value));
          if (!(await onCommit(n))) setV(value == null ? "" : String(value));
        }}
      />
      秒
    </label>
  );
}
