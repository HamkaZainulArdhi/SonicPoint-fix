export const dynamic = "force-dynamic";

import { GoogleGenAI } from "@google/genai";
import { getGeminiConfig } from "@/lib/server";

interface PayloadRequest {
  prompt?: string;
}

/**
 * POST /api/ai/payload — Gemini payload generation for the CLI.
 * The CLI (npm) holds no AI key; GEMINI_API_KEY lives here server-side.
 * Models are tried in order (default → candidates): on rate-limit /
 * overload the next candidate is used. Auth errors fail fast.
 * Body: { prompt: string } → { payload: Record | null, model?: string }.
 * Null = caller must use deterministic fallback (never fail the send).
 */
export async function POST(req: Request): Promise<Response> {
  let body: PayloadRequest;
  try {
    body = (await req.json()) as PayloadRequest;
  } catch {
    return Response.json({ payload: null, error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return Response.json({ payload: null, error: "Missing prompt." }, { status: 400 });
  }

  const gemini = getGeminiConfig();
  if (!gemini) {
    return Response.json({ payload: null, error: "AI not configured on platform." }, { status: 503 });
  }

  const ai = new GoogleGenAI({ apiKey: gemini.apiKey });

  for (const model of gemini.candidates) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.7,
          maxOutputTokens: 500,
          systemInstruction: "Return ONLY a valid JSON object. No markdown. No explanations.",
        },
      });

      const payload = parseJsonObject(res.text);
      if (payload) return Response.json({ payload, model }, { status: 200 });
      // Empty/unparsable answer: try next candidate (cheap, same quota pool).
      console.warn(`[ai/payload] ${model} returned unparsable output, trying next candidate.`);
    } catch (error) {
      if (!isRetryable(error)) {
        const reason = error instanceof Error ? error.message : "Unknown AI failure.";
        return Response.json({ payload: null, error: `AI rejected (${model}): ${reason}` }, { status: 502 });
      }
      console.warn(`[ai/payload] ${model} limited/overloaded, failing over to next candidate.`);
    }
  }

  return Response.json({ payload: null, error: "All AI candidates exhausted." }, { status: 502 });
}

/** Retryable = limit/overload. Auth/bad-request fails fast (another model won't help). */
function isRetryable(error: unknown): boolean {
  const status =
    typeof error === "object" && error !== null && "status" in error ? Number((error as { status: unknown }).status) : NaN;
  if (status === 429 || status === 500 || status === 502 || status === 503) return true;

  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return /rate.?limit|quota|429|overload|unavailable|too many requests/.test(message);
}

function parseJsonObject(text: string | undefined): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const cleaned = text
      .trim()
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
    const parsed: unknown = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
