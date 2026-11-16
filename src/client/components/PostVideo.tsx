import { useState } from "react";

/** 縦長の動画の高さの上限（px）。画面の高さ（vh）には連動させない（docs/DECISIONS.md AP） */
const MAX_H = 440;

/**
 * 投稿動画。枠の形を動画そのものの縦横比に合わせる（黒帯を出さない）。
 * 読み込むまでは縦長 9:16 の枠で待つ。
 */
export function PostVideo({ src, className }: { src: string; className?: string }) {
  const [ratio, setRatio] = useState(9 / 16);
  return (
    <video
      className={`pvideo ${className ?? ""}`}
      src={src}
      controls
      playsInline
      preload="metadata"
      style={{ aspectRatio: String(ratio), width: `min(100%, ${Math.round(MAX_H * ratio)}px)` }}
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
      }}
    />
  );
}
