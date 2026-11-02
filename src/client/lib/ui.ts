// 試作版の便利関数を移植

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2000);
}

export async function copyText(text: string, done = "コピーしました", fail = "コピーできませんでした") {
  try {
    await navigator.clipboard.writeText(text);
    toast(done);
  } catch {
    toast(fail);
  }
}

export const fmtDate = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("ja-JP") : "");

export const fmtSize = (b: number) =>
  b >= 1024 ** 3 ? (b / 1024 ** 3).toFixed(2) + "GB" : (b / 1024 ** 2).toFixed(1) + "MB";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** 1 行分：エスケープしてから **太字** だけを当てる */
export const inlineMd = (t: string) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

/**
 * 簡易書式（## 見出し、- 箇条書き、1. 番号付き、**太字**、空行で段落）。
 * 必ずエスケープしてから書式を当てる（HTML はそのまま表示しない）。
 */
export function mdLite(text: string): string {
  const out: string[] = [];
  let list: { t: "ul" | "ol"; items: string[] } | null = null;
  let para: string[] = [];
  const flushP = () => {
    if (para.length) {
      out.push(`<p>${para.map(inlineMd).join("<br>")}</p>`);
      para = [];
    }
  };
  const flushL = () => {
    if (list) {
      out.push(`<${list.t}>${list.items.map((i) => `<li>${inlineMd(i)}</li>`).join("")}</${list.t}>`);
      list = null;
    }
  };
  for (const raw of String(text).split("\n")) {
    const line = raw.trim();
    let m: RegExpMatchArray | null;
    if (!line) {
      flushP();
      flushL();
      continue;
    }
    if ((m = line.match(/^##\s+(.*)/))) {
      flushP();
      flushL();
      out.push(`<h2>${inlineMd(m[1])}</h2>`);
      continue;
    }
    if ((m = line.match(/^[-・]\s*(.*)/))) {
      flushP();
      if (!list || list.t !== "ul") {
        flushL();
        list = { t: "ul", items: [] };
      }
      list.items.push(m[1]);
      continue;
    }
    if ((m = line.match(/^\d+[.．]\s*(.*)/))) {
      flushP();
      if (!list || list.t !== "ol") {
        flushL();
        list = { t: "ol", items: [] };
      }
      list.items.push(m[1]);
      continue;
    }
    flushL();
    para.push(line);
  }
  flushP();
  flushL();
  return out.join("");
}
