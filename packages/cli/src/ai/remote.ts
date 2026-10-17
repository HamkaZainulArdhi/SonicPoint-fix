// Remote AI client: payload generation via the platform BE
// (POST /api/ai/payload). The CLI holds no AI key — the OpenAI-compatible
// key lives server-side on Vercel. Same shape as GeminiClient.generate
// so runSession accepts either. Null on any failure → caller falls back
// to deterministic payloads.

export interface AiGenerator {
  generate(prompt: string): Promise<Record<string, unknown> | null>;
}

export class RemoteAiClient implements AiGenerator {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(platformUrl: string, fetchImpl: typeof fetch = fetch) {
    this.baseUrl = platformUrl.replace(/\/+$/, "");
    this.fetchImpl = fetchImpl;
  }

  async generate(prompt: string): Promise<Record<string, unknown> | null> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/api/ai/payload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) return null;

      const data = (await res.json()) as { payload?: unknown };
      if (data.payload && typeof data.payload === "object" && !Array.isArray(data.payload)) {
        return data.payload as Record<string, unknown>;
      }

      return null;
    } catch {
      return null;
    }
  }
}
