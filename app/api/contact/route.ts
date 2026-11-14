import { ensureAuth } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
const hits = new Map<string, number[]>();

/** Public contact form of the landing site. Messages appear in the admin Inbox. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 5) return Response.json({ error: "Too many messages – please try again later." }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim().slice(0, 100);
  const email = String(b.email ?? "").trim().slice(0, 160);
  const subject = String(b.subject ?? "").trim().slice(0, 160);
  const body = String(b.message ?? "").trim().slice(0, 4000);
  if (b.website) return Response.json({ ok: true }); // honeypot
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || body.length < 5) return Response.json({ error: "Please fill in your name, a valid e-mail and a message." }, { status: 400 });
  await ensureAuth();
  await sql`INSERT INTO messages (name, email, subject, body) VALUES (${name}, ${email}, ${subject}, ${body})`;
  hits.set(ip, [...recent, now]);
  return Response.json({ ok: true });
}
