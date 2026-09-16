import fs from "fs";
import path from "path";

export type KnowledgeChunk = {
  id: string;
  source: string;
  content: string;
  tokens: Set<string>;
};

let cachedChunks: KnowledgeChunk[] | null = null;

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

function chunkMarkdown(source: string, content: string): KnowledgeChunk[] {
  const sections = content.split(/\n(?=##\s)/);
  return sections
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section, index) => ({
      id: `${source}-${index}`,
      source,
      content: section,
      tokens: tokenize(section),
    }));
}

export function loadKnowledgeChunks(): KnowledgeChunk[] {
  if (cachedChunks) return cachedChunks;

  const dir = path.join(process.cwd(), "data", "knowledge");
  if (!fs.existsSync(dir)) {
    cachedChunks = [];
    return cachedChunks;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  cachedChunks = files.flatMap((file) => {
    const content = fs.readFileSync(path.join(dir, file), "utf-8");
    return chunkMarkdown(file, content);
  });

  return cachedChunks;
}

function scoreQuery(chunk: KnowledgeChunk, queryTokens: Set<string>): number {
  let score = 0;
  for (const token of queryTokens) {
    if (chunk.tokens.has(token)) score += 1;
  }
  return score;
}

export type RankedKnowledgeChunk = {
  id: string;
  source: string;
  score: number;
  content: string;
};

export function retrieveContextRanked(query: string, topK = 4): RankedKnowledgeChunk[] {
  const queryTokens = tokenize(query);
  const chunks = loadKnowledgeChunks();

  const ranked = chunks
    .map((chunk) => ({ chunk, score: scoreQuery(chunk, queryTokens) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  if (ranked.length === 0) {
    return chunks.slice(0, topK).map((chunk) => ({
      id: chunk.id,
      source: chunk.source,
      score: 0,
      content: chunk.content,
    }));
  }

  return ranked.map((r) => ({
    id: r.chunk.id,
    source: r.chunk.source,
    score: r.score,
    content: r.chunk.content,
  }));
}

export function retrieveContext(query: string, topK = 4): string {
  return retrieveContextRanked(query, topK)
    .map((r) => `[${r.source}]\n${r.content}`)
    .join("\n\n---\n\n");
}
