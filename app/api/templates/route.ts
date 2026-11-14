import { guard } from "@/lib/auth";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { templates } from "@/db/schema";
import { defaultTemplate } from "@/lib/seed";
import type { TemplateSchema } from "@/lib/types";

export async function POST(req: Request) {
  const __u = await guard("admin");
  if (__u instanceof Response) return __u;
  const { name, description, duplicateOf, blank } = await req.json();
  let schema: TemplateSchema;
  if (duplicateOf) {
    const [src] = await db.select().from(templates).where(eq(templates.id, duplicateOf)).limit(1);
    if (!src) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    schema = structuredClone(src.schema);
  } else if (blank) {
    const d = defaultTemplate();
    schema = { ...d, cover: d.cover.slice(0, 2), sections: [{ id: crypto.randomUUID().slice(0, 12), title: "First section", blocks: [], pageBreak: true }] };
  } else {
    schema = defaultTemplate();
  }
  const [row] = await db.insert(templates).values({ name: name || "Untitled template", description: description ?? "", schema }).returning();
  return NextResponse.json(row);
}
