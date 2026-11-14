import { guard } from "@/lib/auth";
import { sql } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const a = await guard("admin");
  if (a instanceof Response) return a;
  const { id } = await params;
  const { read } = await req.json().catch(() => ({ read: true }));
  await sql`UPDATE messages SET read = ${read !== false} WHERE id = ${id}`;
  return Response.json({ ok: true });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const a = await guard("admin");
  if (a instanceof Response) return a;
  const { id } = await params;
  await sql`DELETE FROM messages WHERE id = ${id}`;
  return Response.json({ ok: true });
}
