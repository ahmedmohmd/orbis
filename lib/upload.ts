/**
 * Browser-side image preparation, then storage in Postgres via /api/assets (returns a short URL).
 *  - SVG  → uploaded untouched (stays perfectly sharp – ideal for curves/charts)
 *  - PNG  → kept as PNG (no JPEG blur on lines/text), only down-scaled when huge
 *  - photos (JPEG/HEIC/…) → down-scaled and recompressed to JPEG
 */
async function raster(file: File, max: number, type: "image/png" | "image/jpeg"): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    if (k === 1 && file.type === type) return file;
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * k);
    c.height = Math.round(img.height * k);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), type, 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareImage(file: File): Promise<Blob> {
  if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) return new Blob([await file.arrayBuffer()], { type: "image/svg+xml" });
  if (file.type === "image/png") return raster(file, 2400, "image/png");
  return raster(file, 1600, "image/jpeg");
}

export async function uploadImage(file: File): Promise<string> {
  const blob = await prepareImage(file);
  const res = await fetch("/api/assets", { method: "POST", headers: { "Content-Type": blob.type, "X-Filename": encodeURIComponent(file.name) }, body: blob });
  if (!res.ok) throw new Error((await res.text()) || "Upload failed");
  return (await res.json()).url as string;
}
