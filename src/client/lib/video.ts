import { LIMITS } from "../../shared/constants";
import { fmtSize } from "./ui";

export type PickedVideo = { file: File; url: string; duration: number };

/**
 * 選んだ動画を確認する（形式・元のサイズ・長さ 30 秒以内）。
 * 問題があればエラーメッセージを返す。
 */
export function inspectVideo(file: File): Promise<PickedVideo | string> {
  if (!/^video\/(mp4|quicktime|webm)$/.test(file.type)) return Promise.resolve("MP4・MOV・WebMのみ対応しています");
  if (file.size > LIMITS.sourceVideoBytes) return Promise.resolve(`ファイルが大きすぎます（${fmtSize(file.size)}）。動画を短くしてください`);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      const d = v.duration;
      if (!isFinite(d) || d > LIMITS.videoSeconds + 0.5) {
        URL.revokeObjectURL(url);
        resolve(`30秒を超えています（${isFinite(d) ? d.toFixed(1) : "?"}秒）`);
        return;
      }
      resolve({ file, url, duration: d });
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("この動画は読み込めませんでした");
    };
    v.src = url;
  });
}

/** XHR で PUT して進捗を返す */
export function putWithProgress(url: string, body: Blob, headers: Record<string, string>, onProgress: (loaded: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload_failed_${xhr.status}`)));
    xhr.onerror = () => reject(new Error("upload_network_error"));
    xhr.send(body);
  });
}
