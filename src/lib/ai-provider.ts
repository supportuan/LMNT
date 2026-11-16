import { isOllamaAvailable, ollamaChat, type ChatMessage } from "@/lib/ollama";

export type AiProviderId = "openai" | "ollama" | "none";

export type AiStatus = {
  provider: AiProviderId;
  label: string;
  ready: boolean;
  hint: string;
};

function openAiKey() {
  return process.env.OPENAI_API_KEY?.trim() || "";
}

function openAiModel() {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

async function openAiChat(messages: ChatMessage[]): Promise<string> {
  const key = openAiKey();
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: openAiModel(),
      messages,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Prefer OpenAI when a key is set; otherwise use local Ollama if reachable. */
export async function getAiStatus(): Promise<AiStatus> {
  if (openAiKey()) {
    return {
      provider: "openai",
      label: `OpenAI (${openAiModel()})`,
      ready: true,
      hint: "Live suggestions use your OPENAI_API_KEY.",
    };
  }
  if (await isOllamaAvailable()) {
    return {
      provider: "ollama",
      label: `Ollama (${process.env.OLLAMA_MODEL ?? "llama3.2"})`,
      ready: true,
      hint: "Live suggestions use your local Ollama server.",
    };
  }
  return {
    provider: "none",
    label: "Offline templates",
    ready: false,
    hint: "Add OPENAI_API_KEY or run Ollama (OLLAMA_URL) to unlock live AI. Templates still work.",
  };
}

export async function aiChat(messages: ChatMessage[]): Promise<{ text: string; source: AiProviderId }> {
  if (openAiKey()) {
    return { text: await openAiChat(messages), source: "openai" };
  }
  if (await isOllamaAvailable()) {
    return { text: await ollamaChat(messages), source: "ollama" };
  }
  throw new Error("No AI provider configured");
}
