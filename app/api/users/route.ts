import { ensureAuth, guard, hashPassword, toUser, validPassword, validUsername } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const a = await guard("admin");
  if (a instanceof Response) return a;
  await ensureAuth();
  const rows = await sql`SELECT * FROM users ORDER BY created_at`;
  return Response.json(rows.map((r) => toUser(r)));
}

export async function POST(req: Request) {
  const a = await guard("admin");
  if (a instanceof Response) return a;
  await ensureAuth();
  const b = await req.json().catch(() => ({}));
  const username = String(b.username ?? "").trim();
  if (!validUsername(username)) return Response.json({ error: "Username: 3–32 letters, numbers, dot, dash or underscore." }, { status: 400 });
  if (!validPassword(String(b.password ?? ""))) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if ((await sql`SELECT 1 FROM users WHERE lower(username) = ${username.toLowerCase()}`).length) return Response.json({ error: "That username is taken." }, { status: 409 });
  const role = b.role === "admin" ? "admin" : "user";
  const r = await sql`INSERT INTO users (username, password_hash, role, first_name, last_name, birth_date, avatar)
    VALUES (${username}, ${await hashPassword(String(b.password))}, ${role}, ${String(b.firstName ?? "").slice(0, 60)}, ${String(b.lastName ?? "").slice(0, 60)}, ${String(b.birthDate ?? "").slice(0, 10)}, ${String(b.avatar ?? "").slice(0, 80)}) RETURNING *`;
  return Response.json(toUser(r[0]));
}
