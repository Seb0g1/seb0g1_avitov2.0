import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";
import { env } from "@/server/config/env";
import { enterActor } from "./actor";

export const SESSION_COOKIE = "avito_admin_session";
const encoder = new TextEncoder();

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
};

function secret() {
  return encoder.encode(env.NEXTAUTH_SECRET);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifySession(token?: string): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.id !== "string" || typeof payload.email !== "string") {
      return null;
    }

    return {
      id: payload.id,
      email: payload.email,
      role: payload.role === "EMPLOYEE" ? "EMPLOYEE" : "ADMIN",
      name: typeof payload.name === "string" ? payload.name : null
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySession(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  enterActor(session.id);
  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
