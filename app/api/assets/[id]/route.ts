import { guard } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const rows = await sql`SELECT mime, data FROM assets WHERE id = ${id}`;
  if (!rows.length) return new Response("Not found", { status: 404 });
  const headers: Record<string, string> = { "Content-Type": rows[0].mime, "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" };
  // an SVG opened directly must never be able to run scripts on this origin
  if (rows[0].mime === "image/svg+xml") headers["Content-Security-Policy"] = "sandbox; default-src 'none'; style-src 'unsafe-inline'";
  return new Response(new Uint8Array(rows[0].data as Buffer), { headers });
}
