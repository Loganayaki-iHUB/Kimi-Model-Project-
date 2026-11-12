export type Provider = "mock" | "gemini" | "kimi" | "openrouter";
export type Stack = "html-css" | "react";
export interface Plan {
  title: string;
  description: string;
  audience: string;
  pages: { name: string; path: string; sections: string[] }[];
  colors: { name: string; hex: string; usage: string }[];
  typography: string;
  visualDirection: string;
  features: string[];
  responsive: string;
  files: { path: string; purpose: string }[];
}
export interface ProjectFile {
  path: string;
  content: string;
  language: string;
  status?: "partial" | "complete";
}
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
export interface BuildEvent {
  id: string;
  message: string;
  kind: "info" | "file" | "success" | "error";
  createdAt: string;
}
export interface Project {
  id: string;
  title: string;
  stage:
    | "discovery"
    | "planning"
    | "review"
    | "building"
    | "ready"
    | "failed"
    | "paused";
  stack: Stack;
  messages: Message[];
  plan: Plan | null;
  approvedPlan: Plan | null;
  files: ProjectFile[];
  events: BuildEvent[];
  version: number;
  busy: boolean;
  error: string | null;
  revisions: {
    version: number;
    files: ProjectFile[];
    plan: Plan;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
  buildProvider?: string;
  buildModel?: string;
  localPath?: string;
  checkpoint?: {
    completedPaths: string[];
    currentFile: string | null;
    plan: Plan;
  } | null;
}
export type ProjectSummary = Pick<
  Project,
  "id" | "title" | "stage" | "updatedAt" | "version" | "stack"
> & { fileCount?: number; description?: string; colors?: Plan["colors"] };
export interface Settings {
  provider: Provider;
  model: string;
  models: Partial<Record<Provider, string>>;
  activeProfileId: string | null;
  profiles: {
    id: string;
    name: string;
    provider: Provider;
    model: string;
    last4: string;
    createdAt: string;
  }[];
  providers: Record<
    Provider,
    { hasKey: boolean; last4: string; source: "saved" | "environment" | null }
  >;
}
export interface Bootstrap {
  user: { id: string; name: string };
  database: boolean;
  settings: Settings;
  projects: ProjectSummary[];
}
export const providerNames: Record<Provider, string> = {
  mock: "Demo builder",
  gemini: "Google Gemini",
  kimi: "Kimi",
  openrouter: "OpenRouter",
};
