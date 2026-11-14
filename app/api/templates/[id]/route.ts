import { guard } from "@/lib/auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/db/schema";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Ctx) {
  const __u = await guard("admin");
  if (__u instanceof Response) return __u;
  const { id } = await params;
  const body = await req.json();
  const [row] = await db
    .update(templates)
    .set({ ...(body.name !== undefined && { name: body.name }), ...(body.description !== undefined && { description: body.description }), ...(body.schema && { schema: body.schema }), updatedAt: new Date() })
    .where(eq(templates.id, id))
    .returning();
  return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_: Request, { params }: Ctx) {
  const __u = await guard("admin");
  if (__u instanceof Response) return __u;
  const { id } = await params;
  try {
    await db.delete(templates).where(eq(templates.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "This template is used by existing reports. Delete those reports first." }, { status: 409 });
  }
}
