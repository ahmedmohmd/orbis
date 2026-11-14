import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, sql } from "./db";
import { reports, templates } from "@/db/schema";
import { defaultTemplate, octoberData } from "./seed";

/** First run: create the starter template + the October 2026 report converted from the Word file. */
export async function ensureSeed() {
  // Zero-setup: create tables on first run (same shape as db/schema.ts)
  await sql`CREATE TABLE IF NOT EXISTS templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    schema jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES templates(id) ON DELETE RESTRICT,
    title text NOT NULL,
    period text NOT NULL DEFAULT '',
    status text NOT NULL DEFAULT 'draft',
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS assets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mime text NOT NULL,
    filename text NOT NULL DEFAULT '',
    data bytea NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS report_revisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT '',
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now())`;
  const existing = await db.select({ id: templates.id }).from(templates).limit(1);
  if (existing.length) return;
  const [t] = await db
    .insert(templates)
    .values({ name: "Monthly Station Report", description: "Converted from the Abu Minqar October 2026 report", schema: defaultTemplate() })
    .returning();
  await db.insert(reports).values({ templateId: t.id, title: "Abu Minqar", period: "Oct 2026", data: octoberData(), status: "sent" });
}

export const listReports = () =>
  db
    .select({ id: reports.id, title: reports.title, period: reports.period, status: reports.status, updatedAt: reports.updatedAt, templateName: templates.name })
    .from(reports)
    .innerJoin(templates, eq(reports.templateId, templates.id))
    .orderBy(desc(reports.updatedAt));

export const listTemplates = () => db.select().from(templates).orderBy(desc(templates.updatedAt));

export async function getReportWithTemplate(id: string) {
  const rows = await db
    .select({ report: reports, template: templates })
    .from(reports)
    .innerJoin(templates, eq(reports.templateId, templates.id))
    .where(eq(reports.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getTemplate(id: string) {
  const rows = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function latestReportData(templateId: string) {
  const rows = await db.select().from(reports).where(eq(reports.templateId, templateId)).orderBy(desc(reports.updatedAt)).limit(1);
  return rows[0] ?? null;
}
