import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "creator_session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function createPhoneCode() {
  return "246810";
}

export function sessionCookieName() {
  return SESSION_COOKIE;
}

export async function createSession(userId: string) {
  cookies().set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const userId = cookies().get(SESSION_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId }
  });
}
