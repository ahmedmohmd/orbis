/** Send a file as a streamed response. Vercel limits normal responses to 4.5 MB; streamed ones are not limited. */
export function fileResponse(bytes: Uint8Array, type: string, filename: string): Response {
  const CH = 256 * 1024;
  let off = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(c) {
      if (off >= bytes.length) return c.close();
      c.enqueue(bytes.subarray(off, off + CH));
      off += CH;
    },
  });
  return new Response(body, { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store" } });
}
