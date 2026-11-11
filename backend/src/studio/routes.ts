import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  complete,
  encrypt,
  getKey,
  getSettings,
  listModels,
  publicSettings,
} from "./ai";
import { databaseHealthy, projects, settings } from "./database";
import {
  buildProject,
  chat,
  createProject,
  findProject,
  HttpError,
  planProject,
} from "./service";
import { providerSchema, stackSchema } from "./types";

const router = Router();
const route =
  (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
router.get(
  "/bootstrap",
  route(async (_req, res) => {
    res.json({
      user: { id: "loga", name: "loga" },
      database: await databaseHealthy(),
      settings: await publicSettings(),
      projects: await projects()
        .find(
          { userId: "loga" },
          {
            projection: {
              _id: 0,
              id: 1,
              title: 1,
              stage: 1,
              updatedAt: 1,
              version: 1,
              stack: 1,
            },
          },
        )
        .sort({ updatedAt: -1 })
        .limit(100)
        .toArray(),
    });
  }),
);
router.get(
  "/settings",
  route(async (_req, res) => {
    res.json(await publicSettings());
  }),
);
router.put(
  "/settings",
  route(async (req, res) => {
    const input = z
      .object({
        provider: providerSchema,
        model: z.string().trim().min(1).max(200),
        apiKey: z.string().trim().max(2000).optional(),
      })
      .parse(req.body);
    const current = await getSettings();
    if (input.apiKey)
      current.credentials[input.provider] = {
        encrypted: encrypt(input.apiKey),
        last4: input.apiKey.slice(-4),
      };
    if (input.provider !== "mock" && !getKey(current, input.provider))
      throw new HttpError(400, "Add an API key for this provider.");
    current.provider = input.provider;
    current.model = input.model;
    current.models[input.provider] = input.model;
    await settings().replaceOne({ _id: "loga" }, current);
    res.json(await publicSettings());
  }),
);
router.post(
  "/settings/models",
  route(async (req, res) => {
    const input = z
      .object({
        provider: providerSchema,
        apiKey: z.string().trim().max(2000).optional(),
      })
      .parse(req.body);
    const key = input.apiKey || getKey(await getSettings(), input.provider);
    res.json({ models: await listModels(input.provider, key) });
  }),
);
router.post(
  "/settings/test",
  route(async (req, res) => {
    const input = z
      .object({
        provider: providerSchema,
        model: z.string().min(1).max(200),
        apiKey: z.string().trim().max(2000).optional(),
      })
      .parse(req.body);
    if (input.provider !== "mock")
      await complete(
        "Reply with the word connected.",
        "Connection test. Reply briefly.",
        {
          provider: input.provider,
          model: input.model,
          key: input.apiKey || getKey(await getSettings(), input.provider),
        },
      );
    res.json({
      success: true,
      message: "Connection successful. This model can respond to requests.",
    });
  }),
);
router.delete(
  "/settings/credentials/:provider",
  route(async (req, res) => {
    const provider = providerSchema.parse(req.params.provider);
    await settings().updateOne(
      { _id: "loga" },
      { $unset: { [`credentials.${provider}`]: "" } },
    );
    res.json(await publicSettings());
  }),
);
router.post(
  "/projects",
  route(async (_req, res) => {
    res.status(201).json(await createProject());
  }),
);
router.get(
  "/projects/:id",
  route(async (req, res) => {
    res.json(await findProject(req.params.id));
  }),
);
router.post(
  "/projects/:id/messages",
  route(async (req, res) => {
    const { content } = z
      .object({ content: z.string().trim().min(1).max(16000) })
      .parse(req.body);
    res.json(await chat(req.params.id, content));
  }),
);
router.post(
  "/projects/:id/plan",
  route(async (req, res) => {
    const { stack } = z.object({ stack: stackSchema }).parse(req.body);
    res.json(await planProject(req.params.id, stack));
  }),
);
router.post(
  "/projects/:id/build",
  route(async (req, res) => {
    const { approved } = z
      .object({ approved: z.literal(true) })
      .parse(req.body);
    res.status(202).json(await buildProject(req.params.id, approved));
  }),
);
router.post(
  "/projects/:id/retry",
  route(async (req, res) => {
    const project = await findProject(req.params.id);
    if (project.busy || project.stage !== "failed" || !project.plan)
      throw new HttpError(409, "There is no failed build to retry.");
    await projects().updateOne(
      { id: project.id, busy: false, stage: "failed" },
      { $set: { stage: "review", error: null } },
    );
    res.json(await findProject(project.id));
  }),
);
router.post(
  "/projects/:id/restore/:version",
  route(async (req, res) => {
    const project = await findProject(req.params.id);
    if (project.busy)
      throw new HttpError(
        409,
        "Wait for the current operation before restoring a version.",
      );
    const revision = project.revisions.find(
      (r) => r.version === Number(req.params.version),
    );
    if (!revision) throw new HttpError(404, "Version not found.");
    const result = await projects().updateOne(
      { id: project.id, busy: false },
      {
        $set: {
          files: revision.files,
          plan: revision.plan,
          approvedPlan: revision.plan,
          title: revision.plan.title,
          stack:
            revision.stack ||
            (revision.files.some((f) => f.path === "App.js")
              ? "react"
              : "html-css"),
          stage: "ready",
          error: null,
          updatedAt: new Date().toISOString(),
        },
      },
    );
    if (!result.modifiedCount)
      throw new HttpError(409, "The project changed. Reload and try again.");
    res.json(await findProject(project.id));
  }),
);
export default router;
