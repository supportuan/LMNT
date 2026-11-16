import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function memberDocumentsRoot() {
  return process.env.MEMBER_DOCS_DIR ?? path.join(process.cwd(), "data/member-documents");
}

export function isAllowedIdMime(mime: string) {
  return ALLOWED.has(mime);
}

export async function saveMemberIdDocument(file: File) {
  if (!isAllowedIdMime(file.type)) {
    throw new Error("ID must be JPEG, PNG, WebP, or PDF");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("ID file must be under 5 MB");
  }

  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const key = `${randomUUID()}${ext}`;
  const root = memberDocumentsRoot();
  await mkdir(root, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(root, key), buffer);
  return { key, filename: file.name };
}

export function memberIdDocumentPath(key: string) {
  return path.join(memberDocumentsRoot(), key);
}