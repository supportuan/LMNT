import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { consultationReports, leads } from "@/db/schema";
import { canAccessLead } from "@/lib/access";
import { apiError, apiOk, centreIdForSession, requireApiSession } from "@/lib/api-helpers";
import { writeAudit } from "@/lib/audit";
import {
  assertLeadTransition,
  InvalidStateTransitionError,
} from "@/lib/domain/state-machines";
import { publishEvent } from "@/lib/domain/publish-event";
import { PERMISSIONS } from "@/lib/permissions";
import { getConsultationReports, reportToConsultReport } from "@/modules/sales-queries";

const createSchema = z.object({
  leadId: z.string().uuid().optional(),
  prospectName: z.string().min(1),
  lifeStage: z.string().optional(),
  goal: z.string().optional(),
  priceDiscussed: z.string().optional(),
  transcript: z.string().min(30),
  totalScore: z.number(),
  scores: z.record(z.string(), z.number()),
  speakerStats: z.object({ coach: z.number(), client: z.number(), labelled: z.boolean() }),
  questionCount: z.number(),
  openQuestionCount: z.number(),
  objections: z.array(z.string()).optional(),
  buyingSignals: z.array(z.string()).optional(),
  persona: z.string().optional(),
  diagnosis: z.string().optional(),
  followupMessage: z.string().optional(),
  prospectConsent: z.literal(true),
});

export async function GET(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CONSULTATION_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const leadId = new URL(request.url).searchParams.get("leadId") ?? undefined;
  if (leadId && !(await canAccessLead(session, leadId))) {
    return apiError("Not found", 404);
  }
  const reports = await getConsultationReports(session, leadId);
  return apiOk({ reports });
}

export async function POST(request: Request) {
  const { error, session } = await requireApiSession(PERMISSIONS.CONSULTATION_CREATE);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  const centreId = centreIdForSession(session);
  if (!centreId) return apiError("No centre assigned", 400);

  const body = createSchema.parse(await request.json());

  if (body.leadId && !(await canAccessLead(session, body.leadId))) {
    return apiError("Not found", 404);
  }

  const consentAt = new Date();

  const [row] = await db.transaction(async (tx) => {
    const [report] = await tx
      .insert(consultationReports)
      .values({
        organisationId: session.organisationId,
        centreId,
        trainerId: session.userId,
        leadId: body.leadId,
        prospectName: body.prospectName,
        lifeStage: body.lifeStage,
        goal: body.goal,
        priceDiscussed: body.priceDiscussed,
        transcript: body.transcript,
        totalScore: body.totalScore,
        scores: body.scores,
        speakerStats: body.speakerStats,
        questionCount: body.questionCount,
        openQuestionCount: body.openQuestionCount,
        objections: body.objections ?? [],
        buyingSignals: body.buyingSignals ?? [],
        persona: body.persona,
        diagnosis: body.diagnosis,
        followupMessage: body.followupMessage,
        consentAt,
      })
      .returning();

    if (body.leadId) {
      const [lead] = await tx.select().from(leads).where(eq(leads.id, body.leadId)).limit(1);
      if (lead) {
        const leadUpdates: Partial<typeof leads.$inferInsert> = {
          updatedAt: new Date(),
          nextAction: body.followupMessage ?? lead.nextAction,
        };

        const consultationStage = "consultation" as const;
        if (lead.stage !== consultationStage && lead.stage !== "trial" && lead.stage !== "won") {
          try {
            assertLeadTransition(lead.stage, consultationStage);
            leadUpdates.stage = consultationStage;
          } catch (e) {
            if (!(e instanceof InvalidStateTransitionError)) throw e;
          }
        }

        const stageAfterConsult = leadUpdates.stage ?? lead.stage;
        if (
          body.buyingSignals &&
          body.buyingSignals.length >= 2 &&
          stageAfterConsult === "consultation" &&
          body.totalScore >= 70
        ) {
          try {
            assertLeadTransition(stageAfterConsult, "trial");
            leadUpdates.stage = "trial";
          } catch {
            /* keep consultation if trial transition invalid */
          }
        }

        await tx.update(leads).set(leadUpdates).where(eq(leads.id, body.leadId));

        if (leadUpdates.stage && leadUpdates.stage !== lead.stage) {
          await publishEvent(tx, {
            organisationId: session.organisationId,
            type: "LeadStageChanged",
            actorId: session.userId,
            entityType: "lead",
            entityId: body.leadId,
            payload: {
              from: lead.stage,
              to: leadUpdates.stage,
              source: "consultation_report",
              reportId: report.id,
            },
          });
        }
      }
    }

    await publishEvent(tx, {
      organisationId: session.organisationId,
      type: "ConsultationCompleted",
      actorId: session.userId,
      entityType: "consultation_report",
      entityId: report.id,
      payload: {
        leadId: body.leadId,
        totalScore: body.totalScore,
        prospectName: body.prospectName,
      },
    });

    return [report];
  });

  await writeAudit(session, "consultation.report_saved", "consultation_report", row.id, {
    leadId: body.leadId,
    score: body.totalScore,
    consentAt: consentAt.toISOString(),
  });

  return apiOk({ report: reportToConsultReport(row) });
}
