import { SiteFooter, SiteHeader } from "@/components/site/site-chrome";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  let signedIn = false;
  try { signedIn = !!(await getCurrentUser()); } catch { /* database not reachable yet – still show the public site */ }
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader signedIn={signedIn} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
