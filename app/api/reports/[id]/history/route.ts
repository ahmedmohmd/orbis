import { guard } from "@/lib/auth";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Ctx) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { id } = await params;
  const rows = await sql`SELECT id, title, created_at, pg_column_size(data) AS bytes FROM report_revisions WHERE report_id = ${id} ORDER BY created_at DESC LIMIT 50`;
  return NextResponse.json(rows);
}

/** Restore a snapshot (the current state is snapshotted first, so a restore can itself be undone). */
export async function POST(req: Request, { params }: Ctx) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { id } = await params;
  const { revisionId } = await req.json();
  const rev = await sql`SELECT data, title FROM report_revisions WHERE id = ${revisionId} AND report_id = ${id}`;
  if (!rev.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await sql`INSERT INTO report_revisions (report_id, title, data) SELECT id, title, data FROM reports WHERE id = ${id}`;
  await sql`UPDATE reports SET data = ${sql.json(rev[0].data as never)}, title = ${rev[0].title}, updated_at = now() WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
