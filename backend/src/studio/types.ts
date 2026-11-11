import { z } from "zod";

export const providerSchema = z.enum(["mock", "gemini", "kimi", "openrouter"]);
export type Provider = z.infer<typeof providerSchema>;
export const stackSchema = z.enum(["html-css", "react"]);
export type Stack = z.infer<typeof stackSchema>;
export const planSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(5000),
  audience: z.string().max(1000),
  pages: z
    .array(
      z.object({
        name: z.string(),
        path: z.string(),
        sections: z.array(z.string()).max(15),
      }),
    )
    .min(1)
    .max(8),
  colors: z
    .array(
      z.object({
        name: z.string(),
        hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        usage: z.string(),
      }),
    )
    .min(3)
    .max(8),
  typography: z.string().max(1000),
  visualDirection: z.string().max(3000),
  features: z.array(z.string()).max(20),
  responsive: z.string().max(1000),
  files: z
    .array(z.object({ path: z.string(), purpose: z.string() }))
    .min(2)
    .max(16),
});
export type Plan = z.infer<typeof planSchema>;
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
export interface ProjectFile {
  path: string;
  content: string;
  language: string;
}
export interface BuildEvent {
  id: string;
  message: string;
  kind: "info" | "file" | "success" | "error";
  createdAt: string;
}
export interface Revision {
  version: number;
  files: ProjectFile[];
  plan: Plan;
  stack: Stack;
  createdAt: string;
}
export interface Project {
  id: string;
  userId: string;
  title: string;
  stage: "discovery" | "planning" | "review" | "building" | "ready" | "failed";
  stack: Stack;
  messages: Message[];
  plan: Plan | null;
  approvedPlan: Plan | null;
  files: ProjectFile[];
  events: BuildEvent[];
  revisions: Revision[];
  version: number;
  busy: boolean;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  buildProvider?: string;
  buildModel?: string;
}
export interface Settings {
  _id: string;
  provider: Provider;
  model: string;
  credentials: Partial<Record<Provider, { encrypted: string; last4: string }>>;
  models: Partial<Record<Provider, string>>;
}
