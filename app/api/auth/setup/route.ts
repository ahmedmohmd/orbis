import { ensureAuth, hashPassword, startSession, userCount, validPassword, validUsername } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

/** First run only: creates the first administrator. Refused once any user exists. */
export async function POST(req: Request) {
  await ensureAuth();
  if ((await userCount()) > 0) return Response.json({ error: "Setup is already done." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const username = String(b.username ?? "").trim();
  if (!validUsername(username)) return Response.json({ error: "Username: 3–32 letters, numbers, dot, dash or underscore." }, { status: 400 });
  if (!validPassword(String(b.password ?? ""))) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const hash = await hashPassword(String(b.password));
  const r = await sql`INSERT INTO users (username, password_hash, role, first_name, last_name, birth_date, avatar)
    VALUES (${username}, ${hash}, 'admin', ${String(b.firstName ?? "").slice(0, 60)}, ${String(b.lastName ?? "").slice(0, 60)}, ${String(b.birthDate ?? "").slice(0, 10)}, ${String(b.avatar ?? "").slice(0, 80)}) RETURNING id`;
  await startSession(r[0].id as string);
  return Response.json({ ok: true });
}
