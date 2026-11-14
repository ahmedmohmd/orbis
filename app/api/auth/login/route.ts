import { clearFailures, ensureAuth, noteFailure, startSession, throttled, verifyPassword } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await ensureAuth();
  const { username = "", password = "" } = await req.json().catch(() => ({}));
  const u = String(username).trim().toLowerCase();
  const key = `${u}|${req.headers.get("x-forwarded-for") ?? "local"}`;
  const wait = throttled(key);
  if (wait) return Response.json({ error: `Too many attempts. Try again in ${wait}s.` }, { status: 429 });
  const r = await sql`SELECT id, password_hash, active FROM users WHERE lower(username) = ${u} LIMIT 1`;
  const ok = r.length && r[0].active && (await verifyPassword(String(password), r[0].password_hash as string));
  if (!ok) { noteFailure(key); return Response.json({ error: "Wrong username or password." }, { status: 401 }); }
  clearFailures(key);
  await startSession(r[0].id as string);
  return Response.json({ ok: true });
}
