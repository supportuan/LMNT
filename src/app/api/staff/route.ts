import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { organisationMemberships, roleAssignments, users } from "@/db/schema";
import { hashPassword, bumpSessionVersion } from "@/lib/auth";
import { apiError, apiOk, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import { appOrigin, mailLayout, sendMail } from "@/lib/mail";
import { PERMISSIONS } from "@/lib/permissions";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["trainer", "centre_manager"]),
  centreId: z.string().uuid(),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.TRAINER_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = createSchema.parse(await request.json());

  if (session.activeRole === "centre_manager" && !session.centreIds.includes(body.centreId)) {
    return apiError("Cannot assign staff outside your branch", 403);
  }
  if (session.activeRole === "centre_manager" && body.role !== "trainer") {
    return apiError("Centre managers can only add trainers", 403);
  }

  const [existing] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (existing) return apiError("Email already registered", 400);

  const passwordHash = await hashPassword(body.password);

  const [user] = await db
    .insert(users)
    .values({
      email: body.email,
      name: body.name,
      passwordHash,
      status: "active",
    })
    .returning({ id: users.id, email: users.email, name: users.name, status: users.status });

  await db.insert(organisationMemberships).values({
    userId: user.id,
    organisationId: session.organisationId,
    status: "active",
  });

  const [assignment] = await db
    .insert(roleAssignments)
    .values({
      userId: user.id,
      organisationId: session.organisationId,
      centreId: body.centreId,
      role: body.role,
    })
    .returning();

  await writeAudit(session, "staff.created", "user", user.id, { role: body.role });

  const loginUrl = `${appOrigin(request)}/login`;
  const welcome = mailLayout(
    "Your LMNT account is ready",
    `Hi ${body.name},\n\nAn account was created for you at ${session.organisationName}. Sign in with this email and the password your admin shared. Change it after your first login.`,
    { href: loginUrl, label: "Sign in" },
  );
  void sendMail({ to: body.email, subject: "Your LMNT account is ready", ...welcome });

  return apiOk({ user, assignment });
}

const resetSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8).max(200),
});

export async function PATCH(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.USER_MANAGE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const body = resetSchema.parse(await request.json());

  const [membership] = await db
    .select({ id: organisationMemberships.id })
    .from(organisationMemberships)
    .where(
      and(
        eq(organisationMemberships.userId, body.userId),
        eq(organisationMemberships.organisationId, session.organisationId),
      ),
    )
    .limit(1);

  if (!membership) return apiError("User not found", 404);
  if (body.userId === session.userId) {
    return apiError("Use account settings to change your own password", 400);
  }

  if (session.activeRole === "centre_manager") {
    const [assignment] = await db
      .select({ role: roleAssignments.role, centreId: roleAssignments.centreId })
      .from(roleAssignments)
      .where(
        and(
          eq(roleAssignments.userId, body.userId),
          eq(roleAssignments.organisationId, session.organisationId),
        ),
      )
      .limit(1);
    if (!assignment || assignment.role !== "trainer" || !assignment.centreId || !session.centreIds.includes(assignment.centreId)) {
      return apiError("Forbidden", 403);
    }
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(body.password), updatedAt: new Date(), status: "active" })
    .where(eq(users.id, body.userId));
  await bumpSessionVersion(body.userId);

  await writeAudit(session, "user.password_set", "user", body.userId);

  const [target] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, body.userId)).limit(1);
  if (target?.email) {
    const notice = mailLayout(
      "Your LMNT password was updated",
      `Hi ${target.name},\n\nAn admin set a new password for your LMNT account. If you did not expect this, contact ${session.organisationName} right away.`,
    );
    void sendMail({ to: target.email, subject: "Your LMNT password was updated", ...notice });
  }

  return apiOk({});
}
