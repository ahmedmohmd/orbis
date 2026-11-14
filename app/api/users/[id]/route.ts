import { ensureAuth, guard, hashPassword, toUser, validPassword } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const adminCount = async () => ((await sql`SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND active`)[0].n as number) ?? 0;

export async function PUT(req: Request, { params }: Ctx) {
  const a = await guard("admin");
  if (a instanceof Response) return a;
  await ensureAuth();
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  const cur = await sql`SELECT * FROM users WHERE id = ${id}`;
  if (!cur.length) return Response.json({ error: "Not found" }, { status: 404 });
  const role = b.role === "admin" ? "admin" : b.role === "user" ? "user" : (cur[0].role as string);
  const active = typeof b.active === "boolean" ? b.active : (cur[0].active as boolean);
  if ((role !== "admin" || !active) && cur[0].role === "admin" && cur[0].active && (await adminCount()) <= 1)
    return Response.json({ error: "There must be at least one active administrator." }, { status: 400 });
  if (b.password !== undefined && b.password !== "") {
    if (!validPassword(String(b.password))) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    await sql`UPDATE users SET password_hash = ${await hashPassword(String(b.password))} WHERE id = ${id}`;
    await sql`DELETE FROM sessions WHERE user_id = ${id}`;
  }
  const r = await sql`UPDATE users SET role = ${role}, active = ${active},
      first_name = ${b.firstName !== undefined ? String(b.firstName).slice(0, 60) : (cur[0].first_name as string)},
      last_name = ${b.lastName !== undefined ? String(b.lastName).slice(0, 60) : (cur[0].last_name as string)},
      birth_date = ${b.birthDate !== undefined ? String(b.birthDate).slice(0, 10) : (cur[0].birth_date as string)},
      avatar = ${b.avatar !== undefined ? String(b.avatar).slice(0, 80) : (cur[0].avatar as string)}
    WHERE id = ${id} RETURNING *`;
  if (!active) await sql`DELETE FROM sessions WHERE user_id = ${id}`;
  return Response.json(toUser(r[0]));
}

export async function DELETE(_: Request, { params }: Ctx) {
  const a = await guard("admin");
  if (a instanceof Response) return a;
  const { id } = await params;
  if (a.id === id) return Response.json({ error: "You cannot delete your own account." }, { status: 400 });
  const cur = await sql`SELECT role, active FROM users WHERE id = ${id}`;
  if (cur[0]?.role === "admin" && cur[0].active && (await adminCount()) <= 1) return Response.json({ error: "There must be at least one active administrator." }, { status: 400 });
  await sql`DELETE FROM users WHERE id = ${id}`;
  return Response.json({ ok: true });
}
