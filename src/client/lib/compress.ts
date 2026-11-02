// アップロード前にブラウザ内で動画を軽くする（仕様 6-1-2）
// 変換先：MP4（H.264 / AAC）、縦型のまま短辺 720px（拡大しない）、映像 2.5Mbps 前後、30fps、音声 96kbps。
// WebCodecs（mediabunny）を使い、使えないブラウザでは ffmpeg.wasm で変換する。
import { LIMITS } from "../../shared/constants";

export const TARGET = { shortSide: 720, videoBitrate: 2_500_000, audioBitrate: 96_000, frameRate: 30 } as const;

export class CompressError extends Error {}

type Progress = (ratio: number) => void;
type Plan = { videoBitrate: number };

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
export function targetSize(w: number, h: number) {
  const short = Math.min(w, h);
  const scale = short > TARGET.shortSide ? TARGET.shortSide / short : 1;
  return { width: even(w * scale), height: even(h * scale) };
}

/** 15MB に収めるための 2 回目のビットレート（音声分と余裕を引く） */
export function retryBitrate(durationSec: number) {
  const budgetBits = LIMITS.videoBytes * 0.9 * 8;
  const v = budgetBits / Math.max(1, durationSec) - TARGET.audioBitrate;
  return Math.max(400_000, Math.min(TARGET.videoBitrate * 0.7, Math.floor(v)));
}

async function withMediabunny(file: Blob, plan: Plan, onProgress: Progress): Promise<Blob | null> {
  if (typeof VideoEncoder === "undefined") return null;
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new CompressError("映像が見つかりませんでした");
    const { width, height } = targetSize(track.displayWidth, track.displayHeight);
    if (!(await mb.canEncodeVideo("avc", { width, height, bitrate: plan.videoBitrate }))) return null;
    const audioTrack = await input.getPrimaryAudioTrack();
    if (audioTrack && audioTrack.codec !== "aac" && !(await mb.canEncodeAudio("aac", { bitrate: TARGET.audioBitrate }))) return null;

    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const conversion = await mb.Conversion.init({
      input,
      output,
      tracks: "primary",
      video: { codec: "avc", width, height, fit: "fill", frameRate: TARGET.frameRate, bitrate: plan.videoBitrate, forceTranscode: true },
      // 元が AAC ならそのままコピー（再圧縮で音質を落とさない）。それ以外は AAC 96kbps に変換
      audio: audioTrack && audioTrack.codec !== "aac" ? { codec: "aac", bitrate: TARGET.audioBitrate } : { codec: "aac" },
      showWarnings: false,
    });
    if (!conversion.isValid) return null;
    // 音声が変換できず捨てられる場合はフォールバックへ（ボイスが目印のことがあるため音声は必須）
    if (audioTrack && conversion.discardedTracks.some((d) => d.track.type === "audio")) return null;
    conversion.onProgress = (p) => onProgress(Math.min(1, p));
    await conversion.execute();
    const buf = (output.target as InstanceType<typeof mb.BufferTarget>).buffer;
    if (!buf) throw new CompressError("変換に失敗しました");
    return new Blob([buf], { type: "video/mp4" });
  } finally {
    input.dispose?.();
  }
}

// ffmpeg.wasm（コアは約 30MB。Workers の静的アセットの上限を超えるため CDN から読み込む）
const FFMPEG_CORE_BASE = import.meta.env.VITE_FFMPEG_CORE_URL || "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
let ffmpegPromise: Promise<import("@ffmpeg/ffmpeg").FFmpeg> | null = null;
async function loadFfmpeg() {
  ffmpegPromise ??= (async () => {
    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
    const ff = new FFmpeg();
    await ff.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    return ff;
  })().catch((e) => {
    ffmpegPromise = null;
    throw e;
  });
  return ffmpegPromise;
}

async function withFfmpeg(file: Blob, plan: Plan, onProgress: Progress): Promise<Blob> {
  let ff;
  try {
    ff = await loadFfmpeg();
  } catch {
    throw new CompressError("変換機能を読み込めませんでした");
  }
  const { fetchFile } = await import("@ffmpeg/util");
  const onP = ({ progress }: { progress: number }) => onProgress(Math.max(0, Math.min(1, progress)));
  ff.on("progress", onP);
  try {
    await ff.writeFile("in", await fetchFile(file));
    const s = TARGET.shortSide;
    const code = await ff.exec([
      "-i", "in",
      "-vf", `scale='if(lt(iw,ih),min(${s},iw),-2)':'if(lt(iw,ih),-2,min(${s},ih))',fps=${TARGET.frameRate}`,
      "-c:v", "libx264", "-preset", "veryfast", "-b:v", String(plan.videoBitrate), "-maxrate", String(Math.round(plan.videoBitrate * 1.3)), "-bufsize", String(plan.videoBitrate * 2),
      "-pix_fmt", "yuv420p", "-profile:v", "high",
      "-c:a", "aac", "-b:a", String(TARGET.audioBitrate),
      "-movflags", "+faststart",
      "out.mp4",
    ]);
    if (code !== 0) throw new CompressError("この動画は変換できませんでした");
    const data = (await ff.readFile("out.mp4")) as Uint8Array;
    return new Blob([data.slice().buffer], { type: "video/mp4" });
  } finally {
    ff.off("progress", onP);
    await ff.deleteFile("in").catch(() => {});
    await ff.deleteFile("out.mp4").catch(() => {});
  }
}

async function convertOnce(file: Blob, plan: Plan, onProgress: Progress): Promise<{ blob: Blob; engine: "webcodecs" | "ffmpeg" }> {
  try {
    const r = await withMediabunny(file, plan, onProgress);
    if (r) return { blob: r, engine: "webcodecs" };
  } catch (e) {
    if (e instanceof CompressError) throw e;
    // WebCodecs で失敗したら ffmpeg.wasm で試す
    console.warn("WebCodecs conversion failed, falling back to ffmpeg.wasm", e);
  }
  return { blob: await withFfmpeg(file, plan, onProgress), engine: "ffmpeg" };
}

/**
 * 動画を軽くする。15MB を超えたらビットレートを下げて 1 回だけ再変換し、それでも超えたらエラー。
 * 進捗は 0〜1（再変換するときは前半・後半に分けて通知）。
 */
export async function compressVideo(file: File, durationSec: number, onProgress: Progress): Promise<{ file: File; engine: string }> {
  const first = await convertOnce(file, { videoBitrate: TARGET.videoBitrate }, (p) => onProgress(p));
  let blob = first.blob;
  if (blob.size > LIMITS.videoBytes) {
    onProgress(0);
    blob = (await convertOnce(file, { videoBitrate: retryBitrate(durationSec) }, (p) => onProgress(p))).blob;
    if (blob.size > LIMITS.videoBytes) throw new CompressError("15MBに収まりません。動画を短くしてください");
  }
  const name = file.name.replace(/\.[^.]+$/, "") + ".mp4";
  return { file: new File([blob], name, { type: "video/mp4" }), engine: first.engine };
}

/** 変換を 1 本ずつ順番に行う（同時に走らせると端末が重くなるため） */
let queue: Promise<unknown> = Promise.resolve();
export function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
}
