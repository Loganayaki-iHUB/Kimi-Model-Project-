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
  return findProject(id);
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
export async function buildProject(id: string, approved: boolean) {
  if (!approved)
    throw new HttpError(
      400,
      "Explicit approval is required to build a website.",
    );
  const rt = await runtime();
  const project = await lock(id);
  if (project.stage !== "review" || !project.plan) {
    await projects().updateOne({ id }, { $set: { busy: false } });
    throw new HttpError(
      409,
      "Review a current plan before approving the build.",
    );
  }
  await projects().updateOne(
    { id },
    {
      $set: {
        stage: "building",
        files: [],
        events: [],
        approvedPlan: project.plan,
        buildProvider: rt.provider,
        buildModel: rt.model,
      },
    },
  );
  // Build survives a closed browser tab. Every completed file is persisted immediately.
  void (async () => {
    try {
      const plan = project.plan!;
      await event(
        id,
        `Approved plan · ${project.stack === "react" ? "React" : "HTML + CSS + JavaScript"} · ${rt.provider} / ${rt.model}`,
      );
      const demo = rt.provider === "mock" ? demoFiles(plan, project.stack) : [];
      const files: ProjectFile[] = [];
      for (const proposed of plan.files) {
        await event(id, `Creating ${proposed.path} — ${proposed.purpose}`);
        const previous = project.files.find((f) => f.path === proposed.path);
        const content =
          rt.provider === "mock"
            ? demo.find((f) => f.path === proposed.path)?.content
            : await complete(
                filePrompt,
                JSON.stringify({
                  stack: project.stack,
                  plan,
                  file: proposed,
                  brief: conversation(project),
                  previousFile: previous?.content,
                  completedFiles: files.map((f) => ({
                    path: f.path,
                    content: f.content,
                  })),
                }),
                rt,
              );
        const cleaned = content
          ?.trim()
          .replace(/^```[^\n]*\n/, "")
          .replace(/\n```\s*$/, "");
        if (!cleaned)
          throw new Error(`No content was returned for ${proposed.path}.`);
        const language = /\.html$/.test(proposed.path)
          ? "html"
          : /\.css$/.test(proposed.path)
            ? "css"
            : /\.svg$/.test(proposed.path)
              ? "svg"
              : "javascript";
        const file = { path: proposed.path, content: cleaned, language };
        files.push(file);
        await projects().updateOne({ id }, { $push: { files: file } });
        await event(
          id,
          `${proposed.path} created · ${cleaned.split("\n").length} lines`,
          "file",
        );
      }
      await event(
        id,
        `Checked project structure · ${files.length} files available`,
        "info",
      );
      const revision = {
        version: project.version + 1,
        plan,
        files,
        stack: project.stack,
        createdAt: new Date().toISOString(),
      };
      const summary = `Version ${revision.version} is ready to preview.\n\n${plan.description}\n\nPages: ${plan.pages.map((p) => p.name).join(", ")}.\n\nColour palette:\n${plan.colors.map((c) => `• ${c.name}: ${c.hex} — ${c.usage}`).join("\n")}\n\nTypography: ${plan.typography}\n\nBuilt ${files.length} files with ${rt.provider} / ${rt.model}. Preview the result and tell me what you’d like to change.${rt.provider === "mock" ? "\n\nThis is a demo starter. Connect an AI model for custom generation." : ""}`;
      await projects().updateOne(
        { id },
        {
          $set: {
            stage: "ready",
            busy: false,
            version: revision.version,
            error: null,
            updatedAt: revision.createdAt,
          },
          $push: {
            revisions: revision,
            messages: message("assistant", summary),
          },
        },
      );
      await event(id, "Build complete · preview ready", "success");
    } catch (error) {
      const detail = (error as Error).message;
      await event(id, detail, "error").catch(() => undefined);
      await projects()
        .updateOne(
          { id },
          {
            $set: {
              stage: "failed",
              busy: false,
              error: detail,
              files: project.files,
              approvedPlan: project.approvedPlan,
              updatedAt: new Date().toISOString(),
            },
          },
        )
        .catch(() => undefined);
    }
  })();
  return findProject(id);
}
