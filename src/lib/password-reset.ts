import { SignJWT, jwtVerify } from "jose";
import { getSessionSecret } from "@/lib/session-token";

const PURPOSE = "password_reset";

function secret() {
  return getSessionSecret();
}

export async function createPasswordResetToken(userId: string, passwordHash: string) {
  return new SignJWT({ purpose: PURPOSE, stamp: passwordHash.slice(-12) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret());
}

export async function verifyPasswordResetToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.purpose !== PURPOSE || typeof payload.sub !== "string") return null;
    return { userId: payload.sub, stamp: String(payload.stamp ?? "") };
  } catch {
    return null;
  }
}
