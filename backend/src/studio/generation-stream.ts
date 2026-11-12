import { Runtime } from "./ai";
import { config } from "../config/env";

export class InterruptedGeneration extends Error {
  constructor(
    message: string,
    public partial: string,
  ) {
    super(message);
  }
}
export async function generateFile(
  system: string,
  user: string,
  rt: Runtime,
  onProgress: (text: string) => Promise<void>,
) {
  const gemini = rt.provider === "gemini";
  const url = gemini
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(rt.model)}:streamGenerateContent?alt=sse`
    : `${rt.provider === "kimi" ? "https://api.moonshot.ai/v1" : "https://openrouter.ai/api/v1"}/chat/completions`;
  let text = "",
    finish = "",
    doneMarker = false;
  const redact = (value: string) =>
    value
      .split(rt.key || "\0")
      .join("[redacted]")
      .slice(0, 600);
  async function consume(payload: any, streaming: boolean) {
    if (payload.error)
      throw new Error(
        redact(String(payload.error.message || "Provider stream failed.")),
      );
    if (gemini) {
      const candidate = payload.candidates?.[0];
      text +=
        candidate?.content?.parts
          ?.filter((p: any) => p.text && !p.thought)
          .map((p: any) => p.text)
          .join("") || "";
      finish = candidate?.finishReason || finish;
    } else {
      const choice = payload.choices?.[0];
      text +=
        (streaming ? choice?.delta?.content : choice?.message?.content) || "";
      finish = choice?.finish_reason || finish;
    }
    if (text.length > 2_000_000)
      throw new Error(
        "This file is too large for a single generation. Continue with a smaller component.",
      );
    if (text) await onProgress(text);
  }
  try {
    const response = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(180000),
      headers: {
        "Content-Type": "application/json",
        ...(gemini
          ? { "x-goog-api-key": rt.key }
          : { Authorization: `Bearer ${rt.key}` }),
        ...(rt.provider === "openrouter"
          ? { "HTTP-Referer": config.FRONTEND_URL, "X-Title": "Kimo AI Studio" }
          : {}),
      },
      body: JSON.stringify(
        gemini
          ? {
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: user }] }],
              generationConfig: { maxOutputTokens: 16384 },
            }
          : {
              model: rt.model,
              stream: true,
              messages: [
                { role: "system", content: system },
                { role: "user", content: user },
              ],
              max_tokens: 16384,
            },
      ),
    });
    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as any;
      throw new Error(
        `Provider error (${response.status}): ${redact(String(error.error?.message || "Request failed."))}`,
      );
    }
    if (!response.headers.get("content-type")?.includes("text/event-stream")) {
      await consume(await response.json(), false);
      // Some gateways return a complete JSON response even when streaming is requested.
      doneMarker = true;
    } else {
      if (!response.body)
        throw new Error("The provider returned an empty stream.");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      const frame = async (event: string) => {
        const data = event
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) return;
        if (data.trim() === "[DONE]") {
          doneMarker = true;
          return;
        }
        await consume(JSON.parse(data), true);
      };
      try {
        while (true) {
          const result = await reader.read();
          buffer += decoder.decode(result.value, { stream: !result.done });
          let match: RegExpExecArray | null;
          while ((match = /\r?\n\r?\n/.exec(buffer))) {
            const event = buffer.slice(0, match.index);
            buffer = buffer.slice(match.index + match[0].length);
            await frame(event);
          }
          if (result.done) break;
        }
        if (buffer.trim()) await frame(buffer);
      } finally {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    }
    if (finish === "MAX_TOKENS" || finish === "length")
      throw new Error(
        "The model reached its output token limit. Your partial file has been saved.",
      );
    if (finish && !["STOP", "stop", "end_turn"].includes(finish))
      throw new Error(
        `Generation stopped (${finish}). Your current progress has been saved.`,
      );
    if (!finish && !doneMarker)
      throw new Error(
        "The provider stream ended unexpectedly. Your current progress has been saved.",
      );
    if (!text.trim())
      throw new Error(
        "The model returned no source code. Choose another model or retry.",
      );
    return text;
  } catch (error) {
    throw new InterruptedGeneration(
      redact((error as Error).message || "Generation was interrupted."),
      text,
    );
  }
}

export function appendContinuation(prefix: string, next: string) {
  if (!prefix) return next.replace(/^\s*```[^\n]*\n/, "");
  if (next.startsWith(prefix)) return next;
  for (
    let size = Math.min(prefix.length, next.length, 8000);
    size >= 12;
    size--
  )
    if (prefix.slice(-size) === next.slice(0, size))
      return prefix + next.slice(size);
  return prefix + next;
}
