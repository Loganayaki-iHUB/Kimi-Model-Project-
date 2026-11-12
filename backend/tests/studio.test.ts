import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Project } from "../src/studio/types";

test("Studio workflow, persistence, approval, credentials and provider contracts", async (t) => {
  const databaseName = `loga_kimi_test_${randomUUID().replace(/-/g, "")}`;
  const localRoot = await mkdtemp(path.join(tmpdir(), "kimo-studio-test-"));
  process.env.PROJECTS_DIR = localRoot;
  process.env.MONGODB_URI = `mongodb://127.0.0.1:27017/${databaseName}`;
  process.env.AI_PROVIDER = "mock";
  process.env.CREDENTIAL_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  const { connectDatabase, client, projects, settings } = await import(
    "../src/studio/database"
  );
  const { createApp } = await import("../src/app");
  await connectDatabase();
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}/api/studio`;
  const httpFetch = globalThis.fetch;
  async function request(path: string, method = "GET", body?: unknown) {
    const response = await httpFetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: (await response.json()) as any };
  }
  let id = "";
  try {
    await t.test(
      "initializes the loga user and MongoDB-backed workspace",
      async () => {
        const { body } = await request("/bootstrap");
        assert.equal(body.user.name, "loga");
        assert.equal(body.database, true);
        assert.equal(body.settings.provider, "mock");
        const created = await request("/projects", "POST");
        assert.equal(created.status, 201);
        id = created.body.id;
        assert.equal((await projects().findOne({ id }))?.stage, "discovery");
      },
    );
    await t.test(
      "rejects invalid input, approval without a plan, and concurrent operations",
      async () => {
        assert.equal(
          (await request(`/projects/${id}/messages`, "POST", { content: " " }))
            .status,
          400,
        );
        assert.equal(
          (await request(`/projects/${id}/build`, "POST", { approved: false }))
            .status,
          400,
        );
        assert.equal(
          (await request(`/projects/${id}/build`, "POST", { approved: true }))
            .status,
          409,
        );
        await projects().updateOne({ id }, { $set: { busy: true } });
        assert.equal(
          (
            await request(`/projects/${id}/messages`, "POST", {
              content: "Do not run concurrently",
            })
          ).status,
          409,
        );
        await projects().updateOne({ id }, { $set: { busy: false } });
      },
    );
    await t.test(
      "collects a brief and preserves colors, pages and conversation in the plan",
      async () => {
        const chat = await request(`/projects/${id}/messages`, "POST", {
          content:
            "Create a portfolio with Home, About and Contact. Use #234B3E and #F9F6EF and #18181B. Mobile friendly.",
        });
        assert.equal(chat.status, 200);
        assert.equal(chat.body.messages.length, 2);
        assert.equal(chat.body.files.length, 0);
        const plan = await request(`/projects/${id}/plan`, "POST", {
          stack: "html-css",
        });
        assert.equal(plan.status, 200);
        assert.equal(plan.body.stage, "review");
        assert.equal(plan.body.files.length, 0);
        assert.equal(plan.body.plan.colors[0].hex, "#234B3E");
        assert.ok(plan.body.plan.pages.some((p: any) => p.name === "Contact"));
      },
    );
    async function waitForBuild(): Promise<Project> {
      for (let i = 0; i < 100; i++) {
        const result = await request(`/projects/${id}`);
        if (!result.body.busy) {
          assert.equal(result.body.stage, "ready", result.body.error);
          return result.body;
        }
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      throw new Error("Build did not finish");
    }
    await t.test(
      "builds multi-page HTML only after approval and persists files and progress",
      async () => {
        assert.equal(
          (await request(`/projects/${id}/build`, "POST", { approved: true }))
            .status,
          202,
        );
        const result = await waitForBuild();
        assert.equal(result.version, 1);
        assert.ok(result.files.some((f) => f.path === "contact.html"));
        assert.ok(
          result.files.some(
            (f) => f.path === "styles.css" && f.content.includes("#234B3E"),
          ),
        );
        assert.ok(result.events.some((e) => e.kind === "success"));
        assert.equal(result.revisions.length, 1);
        assert.ok(result.messages.at(-1)?.content.includes("#234B3E"));
      },
    );
    await t.test(
      "revisions retain context, invalidate previous approval and support React",
      async () => {
        await request(`/projects/${id}/messages`, "POST", {
          content: "Make the headline bigger and retain the pages and colours.",
        });
        assert.equal(
          (await request(`/projects/${id}/build`, "POST", { approved: true }))
            .status,
          409,
        );
        const plan = await request(`/projects/${id}/plan`, "POST", {
          stack: "react",
        });
        assert.equal(plan.body.stack, "react");
        assert.ok(plan.body.plan.files.some((f: any) => f.path === "App.js"));
        await request(`/projects/${id}/build`, "POST", { approved: true });
        const result = await waitForBuild();
        assert.equal(result.version, 2);
        assert.ok(result.files.some((f) => f.path === "App.js"));
        assert.equal(result.revisions.length, 2);
        const restored = await request(`/projects/${id}/restore/1`, "POST");
        assert.equal(restored.body.stack, "html-css");
        assert.ok(
          restored.body.files.some((f: any) => f.path === "index.html"),
        );
        assert.equal(
          (await request(`/projects/${id}/restore/999`, "POST")).status,
          404,
        );
      },
    );
    await t.test(
      "encrypts keys at rest and never returns them to the browser",
      async () => {
        const secret = "test-only-provider-key-123456789";
        const result = await request("/settings", "PUT", {
          provider: "kimi",
          model: "test-model",
          apiKey: secret,
        });
        assert.equal(result.status, 200);
        assert.equal(result.body.providers.kimi.last4, "6789");
        assert.ok(!JSON.stringify(result.body).includes(secret));
        const stored = await settings().findOne({ _id: "loga" });
        assert.ok(stored?.credentials.kimi?.encrypted);
        assert.ok(!stored.credentials.kimi.encrypted.includes(secret));
        await request("/settings/credentials/kimi", "DELETE");
        assert.equal(
          (await settings().findOne({ _id: "loga" }))?.credentials.kimi,
          undefined,
        );
        await request("/settings", "PUT", {
          provider: "mock",
          model: "demo-builder",
        });
      },
    );
    await t.test(
      "discovers live model contracts without hardcoded catalogues or query-string secrets",
      async () => {
        const observed: string[] = [];
        globalThis.fetch = (async (url: any, init: any) => {
          observed.push(String(url));
          assert.ok(!String(url).includes("test-discovery-key"));
          if (String(url).includes("googleapis")) {
            assert.equal(init.headers["x-goog-api-key"], "test-discovery-key");
            return new Response(
              JSON.stringify({
                models: [
                  {
                    name: "models/text-model",
                    displayName: "Text model",
                    supportedGenerationMethods: ["generateContent"],
                  },
                  {
                    name: "models/embedding",
                    supportedGenerationMethods: ["embedContent"],
                  },
                ],
              }),
              { status: 200 },
            );
          }
          assert.equal(init.headers.Authorization, "Bearer test-discovery-key");
          return new Response(
            JSON.stringify({
              data: [{ id: "provider/model", name: "Available model" }],
            }),
            { status: 200 },
          );
        }) as typeof fetch;
        for (const provider of ["gemini", "kimi", "openrouter"]) {
          const result = await request("/settings/models", "POST", {
            provider,
            apiKey: "test-discovery-key",
          });
          assert.equal(result.status, 200);
          assert.equal(result.body.models.length, 1);
        }
        assert.equal(observed.length, 3);
        globalThis.fetch = httpFetch;
      },
    );
    await t.test(
      "recovers interrupted work and rejects unsafe proposed paths",
      async () => {
        const { validatePlan } = await import("../src/studio/service");
        const p = (await projects().findOne({ id }))!;
        assert.throws(() =>
          validatePlan(
            { ...p.plan!, files: [{ path: "../escape.js", purpose: "bad" }] },
            "react",
          ),
        );
        await projects().updateOne(
          { id },
          { $set: { busy: true, stage: "building" } },
        );
        await connectDatabase();
        const recovered = await projects().findOne({ id });
        assert.equal(recovered?.busy, false);
        assert.equal(recovered?.stage, "failed");
        assert.ok(recovered?.files.length);
        assert.ok(recovered?.error?.includes("restarted"));
      },
    );
    await t.test(
      "uses selected models for completions and redacts provider errors",
      async () => {
        const { complete } = await import("../src/studio/ai");
        for (const provider of ["gemini", "kimi", "openrouter"] as const) {
          globalThis.fetch = (async (_url: any, init: any) => {
            const body = JSON.parse(init.body);
            if (provider === "gemini") {
              assert.equal(
                init.headers["x-goog-api-key"],
                "test-completion-key",
              );
              assert.ok(body.systemInstruction);
              return new Response(
                JSON.stringify({
                  candidates: [
                    {
                      content: {
                        parts: [
                          { thought: true, text: "private reasoning" },
                          { text: "connected" },
                        ],
                      },
                    },
                  ],
                }),
              );
            }
            assert.equal(body.model, "selected-model");
            assert.equal(
              init.headers.Authorization,
              "Bearer test-completion-key",
            );
            return new Response(
              JSON.stringify({
                choices: [
                  { message: { content: "connected" }, finish_reason: "stop" },
                ],
              }),
            );
          }) as typeof fetch;
          assert.equal(
            await complete("System", "User", {
              provider,
              model: "selected-model",
              key: "test-completion-key",
            }),
            "connected",
          );
        }
        globalThis.fetch = (async () =>
          new Response(
            JSON.stringify({
              error: { message: "Invalid test-completion-key" },
            }),
            { status: 401 },
          )) as typeof fetch;
        await assert.rejects(
          () =>
            complete("System", "User", {
              provider: "kimi",
              model: "model",
              key: "test-completion-key",
            }),
          (error) =>
            error instanceof Error &&
            error.message.includes("[redacted]") &&
            !error.message.includes("test-completion-key"),
        );
        globalThis.fetch = httpFetch;
      },
    );
    await t.test(
      "interrupted AI builds preserve completed files and allow continuation",
      async () => {
        const previous = (await projects().findOne({ id }))!;
        await projects().updateOne(
          { id },
          { $set: { busy: false, stage: "review", error: null } },
        );
        await request("/settings", "PUT", {
          provider: "gemini",
          model: "test-generation-model",
          apiKey: "test-generation-key",
        });
        let calls = 0;
        globalThis.fetch = (async () => {
          calls++;
          return calls === 1
            ? new Response(
                JSON.stringify({
                  candidates: [
                    { content: { parts: [{ text: ":root { color: red; }" }] } },
                  ],
                }),
              )
            : new Response(
                JSON.stringify({
                  error: { message: "Simulated provider failure" },
                }),
                { status: 503 },
              );
        }) as typeof fetch;
        assert.equal(
          (await request(`/projects/${id}/build`, "POST", { approved: true }))
            .status,
          202,
        );
        let failed: Project | null = null;
        for (let i = 0; i < 100; i++) {
          const result = await request(`/projects/${id}`);
          if (!result.body.busy) {
            failed = result.body;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.equal(failed?.stage, "paused");
        assert.equal(failed?.version, previous.version);
        assert.ok(
          failed?.files.some(
            (f) => f.path === "styles.css" && f.content.includes("color: red"),
          ),
        );
        assert.ok(failed?.checkpoint?.completedPaths.includes("styles.css"));
        assert.equal(
          await readFile(path.join(failed!.localPath!, "styles.css"), "utf8"),
          ":root { color: red; }",
        );
        assert.ok(failed?.events.some((e) => e.kind === "error"));
        assert.equal(
          (await request(`/projects/${id}/retry`, "POST")).status,
          409,
        );
        globalThis.fetch = httpFetch;
        await request("/settings", "PUT", {
          provider: "mock",
          model: "demo-builder",
        });
        const retried = await request(`/projects/${id}/continue`, "POST", {
          approved: true,
        });
        assert.equal(retried.status, 202);
        const continued = await waitForBuild();
        assert.equal(
          continued.files.find((f) => f.path === "styles.css")?.content,
          ":root { color: red; }",
        );
        assert.equal(continued.checkpoint, null);
        globalThis.fetch = httpFetch;
        await request("/settings", "PUT", {
          provider: "mock",
          model: "demo-builder",
        });
      },
    );
    await t.test(
      "saves truncated streaming output and resumes the exact partial file without regenerating completed files",
      async () => {
        await projects().updateOne(
          { id },
          { $set: { stage: "review", busy: false } },
        );
        await request("/settings", "PUT", {
          provider: "gemini",
          model: "streaming-test",
          apiKey: "streaming-test-secret",
        });
        const sse = (payloads: unknown[]) =>
          new Response(
            payloads.map((p) => "data: " + JSON.stringify(p) + "\n\n").join(""),
            { headers: { "Content-Type": "text/event-stream" } },
          );
        globalThis.fetch = (async () =>
          sse([
            {
              candidates: [
                { content: { parts: [{ text: ":root { color: " }] } },
              ],
            },
            {
              candidates: [
                {
                  content: { parts: [{ text: "blue;" }] },
                  finishReason: "MAX_TOKENS",
                },
              ],
            },
          ])) as typeof fetch;
        await request(`/projects/${id}/build`, "POST", { approved: true });
        let paused: Project | undefined;
        for (let n = 0; n < 100; n++) {
          const value = (await request(`/projects/${id}`)).body;
          if (!value.busy) {
            paused = value;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        assert.equal(paused?.stage, "paused");
        assert.equal(
          paused?.files.find((f) => f.path === "styles.css")?.content,
          ":root { color: blue;",
        );
        assert.equal(
          await readFile(path.join(paused!.localPath!, "styles.css"), "utf8"),
          ":root { color: blue;",
        );
        assert.equal(paused?.checkpoint?.currentFile, "styles.css");
        assert.ok(
          paused?.messages.at(-1)?.content.includes("Continue generation"),
        );
        assert.equal(
          (
            await request(`/projects/${id}/messages`, "POST", {
              content: "Do not replace my partial code",
            })
          ).status,
          409,
        );
        // Simulate a process restart while the current source is checkpointed.
        await projects().updateOne(
          { id },
          { $set: { busy: true, stage: "building" } },
        );
        await connectDatabase();
        assert.equal((await projects().findOne({ id }))?.stage, "paused");
        let calls = 0;
        globalThis.fetch = (async (_url: any, init: any) => {
          calls++;
          const body = JSON.parse(init.body);
          if (calls === 1) {
            assert.ok(body.contents[0].parts[0].text.includes("savedPrefix"));
            return sse([
              {
                candidates: [
                  {
                    content: { parts: [{ text: " }" }] },
                    finishReason: "STOP",
                  },
                ],
              },
            ]);
          }
          return sse([
            {
              candidates: [
                {
                  content: { parts: [{ text: "// generated test file" }] },
                  finishReason: "STOP",
                },
              ],
            },
          ]);
        }) as typeof fetch;
        await request(`/projects/${id}/continue`, "POST", { approved: true });
        const ready = await waitForBuild();
        assert.equal(
          ready.files.find((f) => f.path === "styles.css")?.content,
          ":root { color: blue; }",
        );
        assert.equal(
          ready.files.find((f) => f.path === "styles.css")?.status,
          "complete",
        );
        assert.equal(calls, ready.plan!.files.length);
        assert.ok(
          (
            await readFile(
              path.join(ready.localPath!, ".kimo", "project.json"),
              "utf8",
            )
          ).includes('"stage": "ready"'),
        );
        globalThis.fetch = httpFetch;
        await request("/settings", "PUT", {
          provider: "mock",
          model: "demo-builder",
        });
      },
    );
    await t.test(
      "stores multiple encrypted key/model cards and activates and reveals only the requested connection",
      async () => {
        const saved = await request("/settings", "PUT", {
          provider: "kimi",
          model: "model-a",
          apiKey: "card-key-a-1234",
          name: "Kimi primary",
          activate: false,
        });
        assert.equal(saved.status, 200);
        assert.equal(saved.body.provider, "mock");
        const a = saved.body.profiles.find(
          (p: any) => p.name === "Kimi primary",
        );
        assert.ok(a);
        const second = await request("/settings", "PUT", {
          provider: "kimi",
          model: "model-b",
          apiKey: "card-key-b-5678",
          name: "Kimi secondary",
          activate: false,
        });
        const b = second.body.profiles.find(
          (p: any) => p.name === "Kimi secondary",
        );
        const active = await request(
          `/settings/profiles/${a.id}/activate`,
          "POST",
        );
        assert.equal(active.body.activeProfileId, a.id);
        assert.equal(active.body.model, "model-a");
        const { runtime } = await import("../src/studio/ai");
        assert.equal((await runtime()).key, "card-key-a-1234");
        const reveal = await request(
          `/settings/profiles/${b.id}/reveal`,
          "POST",
        );
        assert.equal(reveal.body.apiKey, "card-key-b-5678");
        const publicData = JSON.stringify((await request("/settings")).body);
        assert.ok(!publicData.includes("card-key-"));
        assert.ok(!publicData.includes("encrypted"));
        const stored = await settings().findOne({ _id: "loga" });
        assert.ok(!JSON.stringify(stored).includes("card-key-a-1234"));
        const edited = await request("/settings", "PUT", {
          provider: "kimi",
          profileId: b.id,
          model: "model-c",
          activate: false,
        });
        assert.equal(edited.body.activeProfileId, a.id);
        assert.equal(
          edited.body.profiles.find((p: any) => p.id === b.id).model,
          "model-c",
        );
        assert.equal(
          (await request("/settings/profiles/missing/reveal", "POST")).status,
          404,
        );
      },
    );
  } finally {
    globalThis.fetch = httpFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    // Only the unique database created by this test is disposable.
    assert.match(databaseName, /^loga_kimi_test_[a-f0-9]{32}$/);
    await client.db(databaseName).dropDatabase();
    await client.close();
    assert.equal(path.dirname(localRoot), path.resolve(tmpdir()));
    assert.ok(path.basename(localRoot).startsWith("kimo-studio-test-"));
    await rm(localRoot, { recursive: true, force: true });
  }
});
