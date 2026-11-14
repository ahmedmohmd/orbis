import { ensureAuth, guard, hashPassword, toUser, validPassword, verifyPassword } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

/** Edit your own profile (names, date of birth, photo) and optionally change your password. */
export async function PUT(req: Request) {
  const me = await guard();
  if (me instanceof Response) return me;
  await ensureAuth();
  const b = await req.json().catch(() => ({}));
  if (b.newPassword) {
    const cur = await sql`SELECT password_hash FROM users WHERE id = ${me.id}`;
    if (!(await verifyPassword(String(b.currentPassword ?? ""), cur[0].password_hash as string))) return Response.json({ error: "Current password is wrong." }, { status: 400 });
    if (!validPassword(String(b.newPassword))) return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    await sql`UPDATE users SET password_hash = ${await hashPassword(String(b.newPassword))} WHERE id = ${me.id}`;
  }
  const r = await sql`UPDATE users SET
      first_name = ${b.firstName !== undefined ? String(b.firstName).slice(0, 60) : me.firstName},
      last_name = ${b.lastName !== undefined ? String(b.lastName).slice(0, 60) : me.lastName},
      birth_date = ${b.birthDate !== undefined ? String(b.birthDate).slice(0, 10) : me.birthDate},
      avatar = ${b.avatar !== undefined ? String(b.avatar).slice(0, 80) : me.avatar}
    WHERE id = ${me.id} RETURNING *`;
  return Response.json(toUser(r[0]));
}
