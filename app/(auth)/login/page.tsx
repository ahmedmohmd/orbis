import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser, userCount } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  if ((await userCount()) === 0) redirect("/setup");
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue to your reports.">
      <Suspense><LoginForm /></Suspense>
    </AuthShell>
  );
}
