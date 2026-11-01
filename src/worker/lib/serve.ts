/** R2 のオブジェクトを返す（Range・条件付きリクエスト対応） */
export async function serveR2(bucket: R2Bucket, req: Request, key: string, cacheControl: string): Promise<Response> {
  const obj = await bucket.get(key, { range: req.headers, onlyIf: req.headers });
  if (!obj) return new Response("Not Found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", cacheControl);

  // onlyIf の条件に合わない（304）
  if (!("body" in obj)) return new Response(null, { status: 304, headers });

  const range = (obj as R2ObjectBody).range as { offset?: number; length?: number } | undefined;
  const isPartial = !!req.headers.get("range") && range?.offset !== undefined;
  if (isPartial) {
    const offset = range!.offset ?? 0;
    const length = range!.length ?? obj.size - offset;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${obj.size}`);
    headers.set("Content-Length", String(length));
  } else {
    headers.set("Content-Length", String(obj.size));
  }
  const body = req.method === "HEAD" ? null : (obj as R2ObjectBody).body;
  return new Response(body, { status: isPartial ? 206 : 200, headers });
}
