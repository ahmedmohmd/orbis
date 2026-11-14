import { guard } from "@/lib/auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, sql } from "@/lib/db";
import { reports } from "@/db/schema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Saves ONLY what changed:  { changes: { field_key: value, … }, title?, status? }
 * The changed keys are merged into the stored JSON (jsonb ||), so a report edited
 * on different days / devices never overwrites fields it did not touch.
 * A snapshot is kept at most every 30 minutes so earlier versions can be restored.
 */
export async function PUT(req: Request, { params }: Ctx) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { id } = await params;
  const b = await req.json();
  const changes = (
    b.changes && typeof b.changes === "object" ? b.changes : {}
  ) as Record<string, unknown>;
  try {
    await sql`INSERT INTO report_revisions (report_id, title, data)
      SELECT id, title, data FROM reports WHERE id = ${id}
      AND NOT EXISTS (SELECT 1 FROM report_revisions WHERE report_id = ${id} AND created_at > now() - interval '30 minutes')`;
    const rows = await sql`UPDATE reports SET
        data = data || ${JSON.stringify(changes)}::text::jsonb,,
        title = COALESCE(${b.title ?? null}, title),
        status = COALESCE(${b.status ?? null}, status),
        period = COALESCE(${typeof changes.period === "string" ? changes.period : null}, period),
        updated_at = now()
      WHERE id = ${id} RETURNING id, updated_at`;
    return rows.length
      ? NextResponse.json({ id, updatedAt: rows[0].updated_at })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { id } = await params;
  await db.delete(reports).where(eq(reports.id, id));
  return NextResponse.json({ ok: true });
}

// data = data || ${sql.json(changes as never)},
