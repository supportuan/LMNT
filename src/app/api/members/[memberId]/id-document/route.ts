import { readFile } from "fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";
import { assertMemberAccess } from "@/lib/access";
import { apiError, requireApiSession } from "@/lib/api-helpers";
import { PERMISSIONS } from "@/lib/permissions";
import { memberIdDocumentPath, saveMemberIdDocument } from "@/lib/member-documents";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_EDIT);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError("No file uploaded", 400);
  }

  try {
    const { key, filename } = await saveMemberIdDocument(file);
    await db
      .update(members)
      .set({
        idDocumentKey: key,
        idDocumentFilename: filename,
        updatedAt: new Date(),
      })
      .where(eq(members.id, memberId));

    return Response.json({ ok: true, filename });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return apiError(message, 400);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  const { memberId } = await params;
  const { error, session } = await requireApiSession(PERMISSIONS.CLIENT_VIEW);
  if (error || !session) return error ?? apiError("Unauthorized", 401);

  try {
    await assertMemberAccess(session, memberId);
  } catch {
    return apiError("Not found", 404);
  }

  const [member] = await db
    .select({
      key: members.idDocumentKey,
      filename: members.idDocumentFilename,
    })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member?.key) return apiError("No ID on file", 404);

  try {
    const data = await readFile(memberIdDocumentPath(member.key));
    const isPdf = member.filename?.toLowerCase().endsWith(".pdf");
    return new Response(data, {
      headers: {
        "Content-Type": isPdf ? "application/pdf" : "application/octet-stream",
        "Content-Disposition": `inline; filename="${member.filename ?? "id"}"`,
      },
    });
  } catch {
    return apiError("File missing on server", 404);
  }
}