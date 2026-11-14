import { UsersManager } from "@/components/users-manager";
import { ensureAuth, requireAdmin, toUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireAdmin();
  await ensureAuth();
  const rows = await sql`SELECT * FROM users ORDER BY created_at`;
  return <UsersManager meId={me.id} users={rows.map((r) => toUser(r))} />;
}
