// ブラウザ保存（使えない環境でも動くように try/catch で包む）
const K = { my: "hsawase-my", nick: "hsawase-nick", sup: "hsawase-sup" };

const get = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* 保存できなくても続行 */
  }
};

export type MySubmission = { code: string; deleteKey: string };

export const loadMy = (): MySubmission[] => {
  try {
    const v = JSON.parse(get(K.my) || "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.code === "string" && typeof x.deleteKey === "string") : [];
  } catch {
    return [];
  }
};
export const addMy = (m: MySubmission) => set(K.my, JSON.stringify([m, ...loadMy().filter((x) => x.code !== m.code)]));
export const loadNick = () => get(K.nick) || "";
export const loadSup = () => get(K.sup) || "";
export const saveNickSup = (nick: string, sup: string) => {
  set(K.nick, nick);
  set(K.sup, sup);
};
