import { customType, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });
import type { ReportData, TemplateSchema } from "@/lib/types";

export const templates = pgTable("templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  schema: jsonb("schema").$type<TemplateSchema>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  templateId: uuid("template_id")
    .notNull()
    .references(() => templates.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  period: text("period").notNull().default(""),
  status: text("status").notNull().default("draft"),
  data: jsonb("data").$type<ReportData>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type TemplateRow = typeof templates.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;

/** Photos live in their own table (not inside the report JSON) so reports stay small and fast. */
export const assets = pgTable("assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  mime: text("mime").notNull(),
  filename: text("filename").notNull().default(""),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Automatic snapshots of a report (at most one per 30 min while editing) – restore from the History button. */
export const reportRevisions = pgTable("report_revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  data: jsonb("data").$type<ReportData>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
