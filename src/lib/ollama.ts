function isPrivateOllamaHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".local") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function ollamaUrl() {
  const raw = process.env.OLLAMA_URL ?? "http://localhost:11434";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("OLLAMA_URL is invalid");
  }
  if (!isPrivateOllamaHost(parsed.hostname) && process.env.OLLAMA_ALLOW_REMOTE !== "true") {
    throw new Error("Refusing to send data to a remote Ollama host. Set OLLAMA_ALLOW_REMOTE=true to allow.");
  }
  return parsed.toString().replace(/\/$/, "");
}

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2";

function ollamaHeaders() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const apiKey = process.env.OLLAMA_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  return headers;
}

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function ollamaChat(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(`${ollamaUrl()}/api/chat`, {
    method: "POST",
    headers: ollamaHeaders(),
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { message?: { content?: string } };
  return data.message?.content?.trim() ?? "";
}

export async function ollamaEmbed(text: string): Promise<number[]> {
  const response = await fetch(`${ollamaUrl()}/api/embeddings`, {
    method: "POST",
    headers: ollamaHeaders(),
    body: JSON.stringify({
      model: process.env.OLLAMA_EMBED_MODEL ?? OLLAMA_MODEL,
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embed error: ${response.status}`);
  }

  const data = (await response.json()) as { embedding?: number[] };
  return data.embedding ?? [];
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${ollamaUrl()}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

export { OLLAMA_URL, OLLAMA_MODEL };
