import bcrypt from "bcryptjs";
import crypto from "crypto";
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
  return createVerificationCode();
}

export function createVerificationCode() {
  if (process.env.NODE_ENV === "test") {
    return "246810";
  }

  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function verificationSecret() {
  return (
    process.env.VERIFICATION_CODE_SECRET ||
    process.env.SESSION_SECRET ||
    "local-verification-code-secret"
  );
}

export function hashVerificationCode({
  channel,
  target,
  code
}: {
  channel: "email" | "phone";
  target: string;
  code: string;
}) {
  return crypto
    .createHmac("sha256", verificationSecret())
    .update(`${channel}:${target}:${code}`)
    .digest("hex");
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
