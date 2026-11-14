import { NextResponse, type NextRequest } from "next/server";

/** Cheap gate in front of the app: no session cookie → login. (The cookie itself is verified against the database in layouts / API guards.) */
const PUBLIC = [/^\/$/, /^\/about/, /^\/contact/, /^\/login/, /^\/setup/, /^\/api\/auth\//, /^\/api\/contact/];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  if (req.cookies.get("srs_session")?.value) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"] };
