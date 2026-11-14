import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const g = globalThis as unknown as { __sql?: ReturnType<typeof postgres> };

export const sql =
  g.__sql ?? postgres(process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/reports", { max: 5 });
if (process.env.NODE_ENV !== "production") g.__sql = sql;

export const db = drizzle(sql, { schema });
