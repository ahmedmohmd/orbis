import { guard } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ensureSeed } from "@/lib/data";

export const runtime = "nodejs";
const MAX = 12 * 1024 * 1024;

export async function POST(req: Request) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const mime = (req.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!mime.startsWith("image/")) return new NextResponse("Only images are accepted", { status: 415 });
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) return new NextResponse("Empty file", { status: 400 });
  if (buf.length > MAX) return new NextResponse("Image is too large (max 12 MB)", { status: 413 });
  let filename = "";
  try { filename = decodeURIComponent(req.headers.get("x-filename") ?? ""); } catch {}
  await ensureSeed();
  const [row] = await sql`INSERT INTO assets (mime, filename, data) VALUES (${mime}, ${filename}, ${buf}) RETURNING id`;
  return NextResponse.json({ url: `/api/assets/${row.id}` });
}
