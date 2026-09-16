import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assessments } from "@/db/schema";

export class AssessmentGateError extends Error {
  code: "missing" | "incomplete" | "parq" | "referral";

  constructor(code: AssessmentGateError["code"], message: string) {
    super(message);
    this.name = "AssessmentGateError";
    this.code = code;
  }
}

export async function assertProgrammePublishAllowed(memberId: string) {
  const [assessment] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.memberId, memberId))
    .orderBy(desc(assessments.createdAt))
    .limit(1);

  if (!assessment) {
    throw new AssessmentGateError(
      "missing",
      "Complete a PAR-Q / readiness assessment before publishing a programme.",
    );
  }

  if (assessment.status !== "completed") {
    throw new AssessmentGateError(
      "incomplete",
      "Finish the client assessment before publishing. Draft or in-progress assessments block programming.",
    );
  }

  if (!assessment.parqCleared) {
    throw new AssessmentGateError(
      "parq",
      "PAR-Q must be cleared before publishing. Resolve readiness flags first.",
    );
  }

  if (assessment.referralRequired) {
    throw new AssessmentGateError(
      "referral",
      "This client requires physician referral before programming. Do not publish until medically cleared.",
    );
  }

  return assessment;
}
