import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByIdentifier } from "@/lib/auth";
import { isRateLimited, recordRateLimitHit } from "@/lib/auth-rate-limit";
import { appOrigin, mailConfigured, mailLayout, sendMail } from "@/lib/mail";
import { createPasswordResetToken } from "@/lib/password-reset";

const schema = z.object({
  identifier: z.string().min(1),
});

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const GENERIC = "If an account exists, we sent password reset instructions.";

function rateKey(identifier: string) {
  return `forgot:${identifier.trim().toLowerCase()}`;
}

export async function POST(request: Request) {
  try {
    if (!mailConfigured()) {
      return NextResponse.json({ error: "Email is not configured" }, { status: 503 });
    }

    const body = schema.parse(await request.json());
    const identifier = body.identifier.trim();
    const key = rateKey(identifier);
    if (await isRateLimited(key, MAX_ATTEMPTS)) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    }
    await recordRateLimitHit(key, WINDOW_MS);

    const user = await findUserByIdentifier(identifier);
    if (user && user.status === "active" && user.email.includes("@")) {
      const token = await createPasswordResetToken(user.id, user.passwordHash);
      const href = `${appOrigin(request)}/reset-password?token=${encodeURIComponent(token)}`;
      const content = mailLayout(
        "Reset your LMNT password",
        `Hi ${user.name},\n\nWe received a request to reset the password for your LMNT account. This link expires in 1 hour.`,
        { href, label: "Reset password" },
      );
      await sendMail({
        to: user.email,
        subject: "Reset your LMNT password",
        ...content,
      });
    }

    return NextResponse.json({ ok: true, message: GENERIC });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
