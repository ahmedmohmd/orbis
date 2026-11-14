import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { displayName, ensureAuth, getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  let unread = 0;
  if (user.role === "admin") {
    await ensureAuth();
    unread = ((await sql`SELECT count(*)::int AS n FROM messages WHERE NOT read`)[0].n as number) ?? 0;
  }
  return (
    <AppShell user={{ name: displayName(user), username: user.username, role: user.role, avatar: user.avatar }} unread={unread}>
      {children}
    </AppShell>
  );
}
