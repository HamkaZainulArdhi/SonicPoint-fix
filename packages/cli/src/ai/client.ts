// Injectable Gemini client. The API key is passed in — this module never
// touches env, disk or console, so it stays unit-testable.

import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiClient {
  private readonly model: string;
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string, model = "gemini-2.5-flash") {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  /** Returns the parsed JSON object, or null on any failure. */
  async generate(prompt: string): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.client
        .getGenerativeModel({ model: this.model })
        .generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        });

      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      return parseJson(text);
    } catch {
      return null;
    }
  }
}

function parseJson(text: string): Record<string, unknown> | null {
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
