/** ファイルの中身（先頭のバイト）から画像の形式を調べる。
 *  iPad などでは、中身は PNG でも「application/x-photo」のような形式で渡されることがあり、そのままだと読めないため */
export async function sniffImageType(file: Blob): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const at = (i: number, ...v: number[]) => v.every((x, k) => b[i + k] === x);
  const ascii = (i: number, n: number) => String.fromCharCode(...b.slice(i, i + n));
  if (at(0, 0x89, 0x50, 0x4e, 0x47)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (ascii(0, 4) === "GIF8") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(4, 4) === "ftyp") return /^(heic|heix|hevc|mif1|msf1)$/.test(ascii(8, 4)) ? "image/heic" : /^avi[fs]$/.test(ascii(8, 4)) ? "image/avif" : null;
  return null;
}
