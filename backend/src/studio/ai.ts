import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { config } from "../config/env";
import { settings } from "./database";
import { Provider, Settings } from "./types";

const endpoints: Record<Exclude<Provider, "mock" | "gemini">, string> = {
  kimi: "https://api.moonshot.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};
const envKeys: Record<Provider, string | undefined> = {
  mock: undefined,
  gemini: config.GEMINI_API_KEY,
  kimi: config.KIMI_API_KEY,
  openrouter: config.OPENROUTER_API_KEY,
};
function cipherKey() {
  if (
    !config.CREDENTIAL_ENCRYPTION_KEY ||
    !/^[a-f0-9]{64}$/i.test(config.CREDENTIAL_ENCRYPTION_KEY)
  )
    throw new Error(
      "Set CREDENTIAL_ENCRYPTION_KEY to 64 hexadecimal characters in backend/.env before saving credentials.",
    );
  return Buffer.from(config.CREDENTIAL_ENCRYPTION_KEY, "hex");
}
export function encrypt(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", cipherKey(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    body.toString("hex"),
  ].join(":");
}
function decrypt(value: string) {
  const [iv, tag, body] = value.split(":");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    cipherKey(),
    Buffer.from(iv, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(body, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
export async function getSettings(): Promise<Settings> {
  let value = await settings().findOne({ _id: "loga" });
  if (!value) {
    const provider: Provider = ["gemini", "kimi", "openrouter"].includes(
      config.AI_PROVIDER,
    )
      ? (config.AI_PROVIDER as Provider)
      : "mock";
    const initial: Settings = {
      _id: "loga",
      provider,
      model: provider === "mock" ? "demo-builder" : config.AI_MODEL || "",
      credentials: {},
      models: {},
    };
    await settings().updateOne(
      { _id: "loga" },
      { $setOnInsert: initial },
      { upsert: true },
    );
    value = await settings().findOne({ _id: "loga" });
  }
  return value!;
}
export function getKey(value: Settings, provider: Provider) {
  const stored = value.credentials[provider];
  return stored ? decrypt(stored.encrypted) : envKeys[provider] || "";
}
export async function publicSettings() {
  const value = await getSettings();
  return {
    provider: value.provider,
    model: value.model,
    models: value.models,
    providers: Object.fromEntries(
      (["mock", "gemini", "kimi", "openrouter"] as Provider[]).map((p) => [
        p,
        {
          hasKey: p === "mock" || !!value.credentials[p] || !!envKeys[p],
          last4: value.credentials[p]?.last4 || envKeys[p]?.slice(-4) || "",
          source: value.credentials[p]
            ? "saved"
            : envKeys[p]
              ? "environment"
              : null,
        },
      ]),
    ),
  };
}
async function requestJson(url: string, key: string, init: RequestInit = {}) {
  let response: globalThis.Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(180000),
    });
  } catch {
    throw new Error(
      "The provider could not be reached or timed out. Check your connection and try again.",
    );
  }
  const payload = (await response.json().catch(() => ({}))) as any;
  if (!response.ok || payload.error) {
    const message = String(
      payload.error?.message || payload.message || "Provider request failed",
    )
      .split(key || "\0")
      .join("[redacted]")
      .slice(0, 500);
    throw new Error(`Provider error (${response.status}): ${message}`);
  }
  return payload;
}
export async function listModels(provider: Provider, key: string) {
  if (provider === "mock")
    return [{ id: "demo-builder", name: "Demo builder · no API key needed" }];
  if (!key) throw new Error("Enter an API key first, or save one in Settings.");
  if (provider === "gemini") {
    const models: { id: string; name: string }[] = [];
    let page = "";
    do {
      const payload = await requestJson(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`,
        key,
        { headers: { "x-goog-api-key": key } },
      );
      for (const m of payload.models || [])
        if (m.supportedGenerationMethods?.includes("generateContent"))
          models.push({
            id: m.name.replace(/^models\//, ""),
            name: m.displayName || m.name,
          });
      page = payload.nextPageToken || "";
    } while (page);
    return models;
  }
  const payload = await requestJson(`${endpoints[provider]}/models`, key, {
    headers: { Authorization: `Bearer ${key}` },
  });
  return (payload.data || [])
    .filter(
      (m: any) =>
        !m.architecture?.output_modalities ||
        m.architecture.output_modalities.includes("text"),
    )
    .map((m: any) => ({ id: m.id, name: m.name || m.id }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));
}
export type Runtime = { provider: Provider; model: string; key: string };
export async function runtime(): Promise<Runtime> {
  const value = await getSettings();
  if (value.provider !== "mock" && !value.model)
    throw new Error("Select a model in Settings before continuing.");
  const key = getKey(value, value.provider);
  if (value.provider !== "mock" && !key)
    throw new Error("Add your provider API key in Settings before continuing.");
  return { provider: value.provider, model: value.model, key };
}
export async function complete(
  system: string,
  user: string,
  rt: Runtime,
  json = false,
): Promise<string> {
  if (rt.provider === "mock")
    throw new Error("Demo generation is handled locally.");
  if (rt.provider === "gemini") {
    const result = await requestJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(rt.model)}:generateContent`,
      rt.key,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": rt.key,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            ...(json ? { responseMimeType: "application/json" } : {}),
            maxOutputTokens: 16384,
          },
        }),
      },
    );
    const candidate = result.candidates?.[0];
    if (candidate?.finishReason === "MAX_TOKENS")
      throw new Error(
        "The model reached its output limit. Try a simpler page or a model with a larger output limit.",
      );
    const text = candidate?.content?.parts
      ?.filter((p: any) => p.text && !p.thought)
      .map((p: any) => p.text)
      .join("");
    if (!text)
      throw new Error(
        "The provider returned no text. Try another model or revise your request.",
      );
    return text;
  }
  const result = await requestJson(
    `${endpoints[rt.provider]}/chat/completions`,
    rt.key,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${rt.key}`,
        ...(rt.provider === "openrouter"
          ? { "HTTP-Referer": config.FRONTEND_URL, "X-Title": "Loga Studio" }
          : {}),
      },
      body: JSON.stringify({
        model: rt.model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 16384,
      }),
    },
  );
  if (result.choices?.[0]?.finish_reason === "length")
    throw new Error(
      "The model reached its output limit. Try a simpler page or a different model.",
    );
  const text = result.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim())
    throw new Error(
      "This model returned no text. Choose a text-generation model in Settings.",
    );
  return text;
}
export function parseJson(text: string): unknown {
  return JSON.parse(
    text
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, ""),
  );
}
