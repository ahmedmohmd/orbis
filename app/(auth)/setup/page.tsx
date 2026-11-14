import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { SetupForm } from "@/components/auth-forms";
import { userCount } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "First-time setup" };

export default async function SetupPage() {
  if ((await userCount()) > 0) redirect("/login");
  return (
    <AuthShell title="Create the administrator" subtitle="First-time setup. This account can manage templates, settings and other users.">
      <SetupForm />
    </AuthShell>
  );
}
