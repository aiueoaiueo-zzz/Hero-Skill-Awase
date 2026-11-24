import { useEffect, useRef, useState } from "react";

/**
 * 再生中の動画の数。1 本でも再生中なら <html> に video-playing を付け、背景の回り続けるアニメーションを止める
 * （スマホで動画のコマが落ちて「ブツブツ」に見えるのを防ぐ。docs/DECISIONS.md BH）
 */
let playing = 0;
const setPlaying = (d: 1 | -1) => {
  playing = Math.max(0, playing + d);
  document.documentElement.classList.toggle("video-playing", playing > 0);
};

/** 縦長の動画の高さの上限（px）。画面の高さ（vh）には連動させない（docs/DECISIONS.md AP） */
const MAX_H = 440;

/**
 * 投稿動画。枠の形を動画そのものの縦横比に合わせる（黒帯を出さない）。
 * 読み込むまでは縦長 9:16 の枠で待つ。
 */
export function PostVideo({ src, className }: { src: string; className?: string }) {
  const [ratio, setRatio] = useState(9 / 16);
  const on = useRef(false);
  const mark = (v: boolean) => {
    if (on.current === v) return;
    on.current = v;
    setPlaying(v ? 1 : -1);
  };
  // 再生中のまま画面から消えた（別の画面に移った）ときも数を戻す
  useEffect(() => () => mark(false), []);
  return (
    <video
      className={`pvideo ${className ?? ""}`}
      src={src}
      controls
      playsInline
      preload="metadata"
      style={{ aspectRatio: String(ratio), width: `min(100%, ${Math.round(MAX_H * ratio)}px)` }}
      onPlaying={() => mark(true)}
      onPause={() => mark(false)}
      onEnded={() => mark(false)}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
      }}
    />
  );
}
