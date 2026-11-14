import { Inbox } from "@/components/inbox";
import { ensureAuth, requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requireAdmin();
  await ensureAuth();
  const rows = await sql`SELECT id, name, email, subject, body, read, created_at FROM messages ORDER BY created_at DESC LIMIT 200`;
  return <Inbox messages={rows.map((r) => ({ id: r.id as string, name: r.name as string, email: r.email as string, subject: r.subject as string, body: r.body as string, read: r.read as boolean, createdAt: new Date(r.created_at as string).toISOString() }))} />;
}
