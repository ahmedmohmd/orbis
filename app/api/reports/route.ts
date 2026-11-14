import { guard } from "@/lib/auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { reports } from "@/db/schema";

export async function POST(req: Request) {
  const __u = await guard();
  if (__u instanceof Response) return __u;
  const { templateId, title, period, copyFrom } = await req.json();
  let data: Record<string, unknown> = {};
  if (copyFrom) {
    const [src] = await db.select().from(reports).where(eq(reports.id, copyFrom)).limit(1);
    if (src) data = structuredClone(src.data);
  }
  data.period = period;
  const [row] = await db.insert(reports).values({ templateId, title: title || "Monthly report", period: period || "", data }).returning();
  return NextResponse.json(row);
}
