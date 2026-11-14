import "server-only";
import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { sql } from "./db";

export type Role = "admin" | "user";
export interface AppUser {
  id: string;
  username: string;
  role: Role;
  firstName: string;
  lastName: string;
  birthDate: string; // yyyy-mm-dd or ""
  avatar: string; // /api/assets/<id> or ""
  active: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export const COOKIE = "srs_session";
const DAYS = 14;

let ready: Promise<void> | undefined;
/** Zero-setup: create the auth tables on first use. */
export function ensureAuth(): Promise<void> {
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      role text NOT NULL DEFAULT 'user',
      first_name text NOT NULL DEFAULT '',
      last_name text NOT NULL DEFAULT '',
      birth_date text NOT NULL DEFAULT '',
      avatar text NOT NULL DEFAULT '',
      active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_login timestamptz)`;
    await sql`CREATE TABLE IF NOT EXISTS sessions (
      token_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      email text NOT NULL,
      subject text NOT NULL DEFAULT '',
      body text NOT NULL,
      read boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now())`;
  })().catch((e) => {
    ready = undefined;
    throw e;
  });
  return ready;
}

/* ---------------------------- passwords ---------------------------- */
const scrypt = (pw: string, salt: Buffer) =>
  new Promise<Buffer>((res, rej) =>
    scryptCb(pw, salt, 64, (e, k) => (e ? rej(e) : res(k))),
  );

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scrypt(pw, salt)).toString("hex")}`;
}
export async function verifyPassword(
  pw: string,
  stored: string,
): Promise<boolean> {
  const [alg, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const a = await scrypt(pw, Buffer.from(salt, "hex"));
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export const validUsername = (u: string) => /^[a-z0-9._-]{3,32}$/i.test(u);
export const validPassword = (p: string) => p.length >= 8 && p.length <= 200;

/* ----------------------------- mapping ----------------------------- */
type Row = Record<string, unknown>;
export const toUser = (r: Row): AppUser => ({
  id: r.id as string,
  username: r.username as string,
  role: (r.role as Role) === "admin" ? "admin" : "user",
  firstName: (r.first_name as string) ?? "",
  lastName: (r.last_name as string) ?? "",
  birthDate: (r.birth_date as string) ?? "",
  avatar: (r.avatar as string) ?? "",
  active: r.active !== false,
  createdAt: new Date(r.created_at as string).toISOString(),
  lastLogin: r.last_login
    ? new Date(r.last_login as string).toISOString()
    : null,
});

export const displayName = (
  u: Pick<AppUser, "firstName" | "lastName" | "username">,
) => `${u.firstName} ${u.lastName}`.trim() || u.username;

export async function userCount(): Promise<number> {
  await ensureAuth();
  const r = await sql`SELECT count(*)::int AS n FROM users`;
  return (r[0].n as number) ?? 0;
}

/* ----------------------------- sessions ----------------------------- */
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function startSession(userId: string) {
  await ensureAuth();
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + DAYS * 864e5);
  // await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${hashToken(token)}, ${userId}, ${expires})`;

  await sql`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${hashToken(token)}, ${userId}, ${expires.toISOString()}::timestamptz)`;

  await sql`DELETE FROM sessions WHERE expires_at < now()`;
  await sql`UPDATE users SET last_login = now() WHERE id = ${userId}`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure:
      process.env.NODE_ENV === "production" &&
      process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const t = jar.get(COOKIE)?.value;
  if (t) {
    await ensureAuth();
    await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(t)}`;
  }
  jar.delete(COOKIE);
}

/** The signed-in user (or null). Verified against the database on every call. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  await ensureAuth();
  const r =
    await sql`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ${hashToken(t)} AND s.expires_at > now() AND u.active LIMIT 1`;
  return r.length ? toUser(r[0] as Row) : null;
}

/* --------------------------- API guards --------------------------- */
/** Use at the top of an API route: `const u = await guard(); if (u instanceof Response) return u;` */
export async function guard(role?: Role): Promise<AppUser | Response> {
  const u = await getCurrentUser();
  if (!u) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (role === "admin" && u.role !== "admin")
    return Response.json({ error: "Administrators only." }, { status: 403 });
  return u;
}

/* ----------------------- login throttling ----------------------- */
const fails = new Map<string, { n: number; until: number }>();
export function throttled(key: string): number {
  const f = fails.get(key);
  return f && f.until > Date.now()
    ? Math.ceil((f.until - Date.now()) / 1000)
    : 0;
}
export function noteFailure(key: string) {
  const f = fails.get(key) ?? { n: 0, until: 0 };
  f.n += 1;
  if (f.n >= 5) {
    f.until = Date.now() + 60_000;
    f.n = 0;
  }
  fails.set(key, f);
}
export const clearFailures = (key: string) => void fails.delete(key);

/** For server pages: sign-in required (redirects to /login). */
export async function requireUser(): Promise<AppUser> {
  const { redirect } = await import("next/navigation");
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  return u as AppUser;
}
/** For server pages: administrators only (others go back to the dashboard). */
export async function requireAdmin(): Promise<AppUser> {
  const { redirect } = await import("next/navigation");
  const u = await requireUser();
  if (u.role !== "admin") redirect("/dashboard");
  return u;
}
