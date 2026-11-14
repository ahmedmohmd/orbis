import { ensureAuth, guard } from "@/lib/auth";
import { sql } from "@/lib/db";

export async function GET() {
  const a = await guard("admin");
  if (a instanceof Response) return a;
  await ensureAuth();
  return Response.json(await sql`SELECT id, name, email, subject, body, read, created_at FROM messages ORDER BY created_at DESC LIMIT 200`);
}
