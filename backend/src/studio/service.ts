import { randomUUID } from "crypto";
import { projects } from "./database";
import { complete, parseJson, runtime } from "./ai";
import { demoFiles, demoPlan } from "./demo";
import { discoveryPrompt, filePrompt, planningPrompt } from "./prompts";
import {
  BuildEvent,
  Message,
  Plan,
  Project,
  ProjectFile,
  Stack,
  planSchema,
} from "./types";
import { z } from "zod";
import {
  ensureLocalProject,
  saveSource,
  saveLocalState,
  saveRevision,
} from "./storage";
import { generateFile, appendContinuation } from "./generation-stream";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const message = (role: Message["role"], content: string): Message => ({
  id: randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString(),
});
export async function findProject(id: string) {
  const project = await projects().findOne(
    { id, userId: "loga" },
    { projection: { _id: 0 } },
  );
  if (!project) throw new HttpError(404, "Project not found.");
  return project;
}
async function lock(id: string, changes: Partial<Project> = {}) {
  const project = await projects().findOneAndUpdate(
    { id, userId: "loga", busy: false },
    {
      $set: {
        ...changes,
        busy: true,
        error: null,
        updatedAt: new Date().toISOString(),
      },
    },
    { returnDocument: "after", projection: { _id: 0 } },
  );
  if (!project) {
    await findProject(id);
    throw new HttpError(
      409,
      "This project is already working. Please wait for it to finish.",
    );
  }
  return project;
}
export async function createProject(): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: randomUUID(),
    userId: "loga",
    title: "Untitled website",
    stage: "discovery",
    stack: "html-css",
    messages: [],
    plan: null,
    approvedPlan: null,
    files: [],
    events: [],
    revisions: [],
    version: 0,
    busy: false,
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  await projects().insertOne({ ...project });
  return project;
}
function conversation(project: Project) {
  return project.messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n")
    .slice(-65000);
}
export async function chat(id: string, content: string) {
  const rt = await runtime();
  const project = await lock(id);
  if (project.checkpoint) {
    await projects().updateOne({ id }, { $set: { busy: false } });
    throw new HttpError(
      409,
      "Continue the paused build before changing its requirements, or start a new project.",
    );
  }
  try {
    project.messages.push(message("user", content));
    const title =
      project.title === "Untitled website"
        ? content.replace(/\s+/g, " ").slice(0, 65)
        : project.title;
    await projects().updateOne(
      { id },
      {
        $set: {
          messages: project.messages,
          title,
          plan: null,
          stage: "discovery",
        },
      },
    );
    let reply: string;
    if (rt.provider === "mock") {
      const count = project.messages.filter((m) => m.role === "user").length;
      reply =
        count === 1
          ? "Let’s shape this into a website. A few details will help:\n\n1. Who is this for, and what should visitors do?\n2. Which pages or sections do you need?\n3. Any colours (hex codes welcome), style references, or must-have features?\n\nAnswer what matters, or choose Review plan and I’ll use sensible defaults. Demo mode is active; connect an AI provider in Settings for tailored design advice."
          : "I’ve added those details to your brief. Anything else about your pages, colours, content or interactions? When you’re happy, choose Review plan to see the proposed design before approving a build.";
    } else {
      reply = z
        .object({ reply: z.string().min(1).max(12000) })
        .parse(
          parseJson(
            await complete(discoveryPrompt, conversation(project), rt, true),
          ),
        ).reply;
    }
    await projects().updateOne(
      { id },
      {
        $push: { messages: message("assistant", reply) },
        $set: { busy: false, updatedAt: new Date().toISOString() },
      },
    );
  } catch (error) {
    await projects().updateOne(
      { id },
      { $set: { busy: false, error: (error as Error).message } },
    );
    throw error;
  }
  return findProject(id);
}
export function validatePlan(plan: Plan, stack: Stack) {
  const paths = plan.files.map((f) => f.path);
  if (
    new Set(paths).size !== paths.length ||
    paths.some(
      (p) =>
        p.length > 160 ||
        !/^[a-zA-Z0-9_./-]+$/.test(p) ||
        p.startsWith("/") ||
        p.split("/").some((s) => s === ".." || s === "." || !s) ||
        !/\.(html|css|js|jsx|json|svg)$/.test(p),
    )
  )
    throw new Error(
      "The model proposed an unsupported file structure. Please generate the plan again.",
    );
  const required =
    stack === "react"
      ? ["App.js", "index.js", "styles.css"]
      : ["index.html", "styles.css", "script.js"];
  if (required.some((p) => !paths.includes(p)))
    throw new Error(
      `The plan is missing required files (${required.join(", ")}). Generate the plan again.`,
    );
  return plan;
}
export async function planProject(id: string, stack: Stack) {
  const rt = await runtime();
  const project = await lock(id);
  if (project.checkpoint) {
    await projects().updateOne({ id }, { $set: { busy: false } });
    throw new HttpError(
      409,
      "Continue the saved build before creating a different plan.",
    );
  }
  try {
    if (!project.messages.some((m) => m.role === "user"))
      throw new HttpError(400, "Describe your website in the chat first.");
    await projects().updateOne(
      { id },
      { $set: { stage: "planning", stack, plan: null } },
    );
    project.stack = stack;
    const plan = validatePlan(
      rt.provider === "mock"
        ? demoPlan(project)
        : planSchema.parse(
            parseJson(
              await complete(
                planningPrompt,
                `Selected stack: ${stack}\n\n${conversation(project)}`,
                rt,
                true,
              ),
            ),
          ),
      stack,
    );
    await projects().updateOne(
      { id },
      {
        $set: {
          plan,
          title: plan.title,
          stack,
          stage: "review",
          busy: false,
          updatedAt: new Date().toISOString(),
        },
        $push: {
          messages: message(
            "assistant",
            "Your website plan is ready. Review the pages, visual direction, colour palette and file structure. You can request changes in chat, or approve the plan to start building.",
          ),
        },
      },
    );
  } catch (error) {
    await projects().updateOne(
      { id },
      {
        $set: {
          busy: false,
          stage: "discovery",
          error: (error as Error).message,
        },
      },
    );
    throw error;
  }
  const saved = await findProject(id);
  await saveLocalState(saved);
  return saved;
}
async function event(
  id: string,
  text: string,
  kind: BuildEvent["kind"] = "info",
) {
  const entry: BuildEvent = {
    id: randomUUID(),
    message: text,
    kind,
    createdAt: new Date().toISOString(),
  };
  await projects().updateOne(
    { id },
    { $push: { events: entry }, $set: { updatedAt: entry.createdAt } },
  );
}
export async function buildProject(
  id: string,
  approved: boolean,
  resume = false,
) {
  if (!approved)
    throw new HttpError(
      400,
      "Explicit approval is required to build or continue a website.",
    );
  const rt = await runtime();
  const project = await lock(id);
  if (
    resume
      ? !project.checkpoint || !["paused", "failed"].includes(project.stage)
      : project.stage !== "review" || !project.plan
  ) {
    await projects().updateOne({ id }, { $set: { busy: false } });
    throw new HttpError(
      409,
      resume
        ? "There is no paused generation to continue."
        : "Review a current plan before approving the build.",
    );
  }
  const checkpoint = resume
    ? project.checkpoint!
    : {
        plan: project.plan!,
        stack: project.stack,
        completedPaths: [],
        currentFile: null,
        baselineFiles: project.files,
        startedAt: new Date().toISOString(),
      };
  try {
    await ensureLocalProject(project);
  } catch (error) {
    await projects().updateOne({ id }, { $set: { busy: false } });
    throw error;
  }
  await projects().updateOne(
    { id },
    {
      $set: {
        stage: "building",
        checkpoint,
        approvedPlan: checkpoint.plan,
        ...(resume ? {} : { events: [] }),
        buildProvider: rt.provider,
        buildModel: rt.model,
      },
    },
  );
  void (async () => {
    try {
      const plan = checkpoint.plan;
      await event(
        id,
        `${resume ? "Continuing saved build" : "Approved plan"} | ${checkpoint.completedPaths.length}/${plan.files.length} files completed | ${rt.provider} / ${rt.model}`,
      );
      await saveLocalState(await findProject(id));
      const demo =
        rt.provider === "mock" ? demoFiles(plan, checkpoint.stack) : [];
      for (const proposed of plan.files) {
        if (checkpoint.completedPaths.includes(proposed.path)) continue;
        const current = await findProject(id);
        const partial =
          checkpoint.currentFile === proposed.path
            ? current.files.find(
                (f) => f.path === proposed.path && f.status === "partial",
              )?.content || ""
            : "";
        checkpoint.currentFile = proposed.path;
        await projects().updateOne({ id }, { $set: { checkpoint } });
        await event(
          id,
          `${partial ? "Continuing" : "Creating"} ${proposed.path} - ${proposed.purpose}`,
        );
        let lastSaved = 0,
          lastContent = partial;
        const persist = async (
          content: string,
          status: "partial" | "complete",
        ) => {
          const file: ProjectFile = {
            path: proposed.path,
            content,
            language: proposed.path.endsWith(".html")
              ? "html"
              : proposed.path.endsWith(".css")
                ? "css"
                : proposed.path.endsWith(".svg")
                  ? "svg"
                  : "javascript",
            status,
          };
          await saveSource(project, file);
          const latest = await findProject(id);
          const files = latest.files.filter((f) => f.path !== file.path);
          files.push(file);
          await projects().updateOne(
            { id },
            { $set: { files, updatedAt: new Date().toISOString() } },
          );
          lastContent = content;
          lastSaved = Date.now();
        };
        let content: string;
        if (rt.provider === "mock")
          content = demo.find((f) => f.path === proposed.path)?.content || "";
        else {
          const context = JSON.stringify({
            stack: checkpoint.stack,
            plan,
            file: proposed,
            brief: conversation(project),
            previousFile: checkpoint.baselineFiles
              .find((f) => f.path === proposed.path)
              ?.content?.slice(0, 20000),
            completedFiles: current.files
              .filter((f) => checkpoint.completedPaths.includes(f.path))
              .map((f) => ({
                path: f.path,
                content: f.content.slice(0, 12000),
              })),
            ...(partial
              ? {
                  continuation:
                    "Continue the exact file from the last saved character. Return ONLY the missing suffix. Do not restart, repeat any saved source, add markdown fences or explanations. The existing content ends exactly at the end of savedPrefix.",
                  savedPrefix: partial,
                }
              : {}),
          });
          try {
            const generated = await generateFile(
              filePrompt +
                (partial
                  ? "\nCONTINUATION: Return only the missing suffix after the saved prefix. Preserve whitespace needed at the boundary."
                  : ""),
              context,
              rt,
              async (chunk) => {
                const merged = appendContinuation(partial, chunk);
                if (Date.now() - lastSaved >= 1000)
                  await persist(merged, "partial");
              },
            );
            content = appendContinuation(partial, generated);
          } catch (error) {
            const suffix = (error as { partial?: string }).partial || "";
            const merged = suffix
              ? appendContinuation(partial, suffix)
              : lastContent;
            if (merged) await persist(merged, "partial");
            throw error;
          }
        }
        const cleaned = content
          .replace(/^\s*```[^\n]*\n/, "")
          .replace(/\n```\s*$/, "");
        if (!cleaned.trim())
          throw new Error(`No content was returned for ${proposed.path}.`);
        await persist(cleaned, "complete");
        checkpoint.completedPaths.push(proposed.path);
        checkpoint.currentFile = null;
        await projects().updateOne({ id }, { $set: { checkpoint } });
        await saveLocalState(await findProject(id));
        await event(
          id,
          `${proposed.path} saved locally | ${cleaned.split("\n").length} lines`,
          "file",
        );
      }
      const latest = await findProject(id);
      const files = plan.files.map(
        (p) => latest.files.find((f) => f.path === p.path)!,
      );
      const revision = {
        version: project.version + 1,
        plan,
        files,
        stack: checkpoint.stack,
        createdAt: new Date().toISOString(),
      };
      await saveRevision(project, revision);
      const summary = `Version ${revision.version} is ready to preview.\n\n${plan.description}\n\nPages: ${plan.pages.map((p) => p.name).join(", ")}.\n\nColour palette:\n${plan.colors.map((c) => `- ${c.name}: ${c.hex} - ${c.usage}`).join("\n")}\n\nTypography: ${plan.typography}\n\n${files.length} files saved in ${project.localPath}.\nBuilt with ${rt.provider} / ${rt.model}.${rt.provider === "mock" ? "\nDemo mode uses a starter template." : ""}`;
      await projects().updateOne(
        { id },
        {
          $set: {
            stage: "ready",
            busy: false,
            version: revision.version,
            files,
            checkpoint: null,
            error: null,
            updatedAt: revision.createdAt,
          },
          $push: {
            revisions: revision,
            messages: message("assistant", summary),
          },
        },
      );
      await event(
        id,
        "Build complete | files saved locally | preview ready",
        "success",
      );
      await saveLocalState(await findProject(id));
    } catch (error) {
      const detail = (error as Error).message;
      await event(id, detail, "error").catch(() => undefined);
      await projects()
        .updateOne(
          { id },
          {
            $set: {
              stage: "paused",
              busy: false,
              error: detail,
              updatedAt: new Date().toISOString(),
            },
            $push: {
              messages: message(
                "assistant",
                `Generation paused. ${detail}\n\nYour completed files and partial source are saved locally and in MongoDB. Choose Continue generation to resume from the saved position. You can change the active model or key in Settings first if needed.`,
              ),
            },
          },
        )
        .catch(() => undefined);
      await saveLocalState(await findProject(id)).catch(() => undefined);
    }
  })();
  return findProject(id);
}
