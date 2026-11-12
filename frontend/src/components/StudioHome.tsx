"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  Download,
  FileCode2,
  Folder,
  Layers3,
  Loader2,
  Menu,
  MessageSquare,
  Monitor,
  Play,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import { api } from "../lib/studio-api";
import { exportProject, downloadSource } from "../lib/project-export";
import Link from "next/link";
import {
  Bootstrap,
  Project,
  ProjectSummary,
  Settings,
  Stack,
  providerNames,
} from "../types/studio";
import { StudioSettings } from "./StudioSettings";
import { StudioPlan } from "./StudioPlan";
import { StudioPreview } from "./StudioPreview";
import { WorkflowStepper } from "./WorkflowStepper";
import { StudioThemeToggle } from "./StudioTheme";

type Tab = "plan" | "preview" | "files" | "activity";
const stages: Record<Project["stage"], string> = {
  discovery: "Shaping your idea",
  planning: "Preparing your plan",
  review: "Ready for review",
  building: "Building your website",
  ready: "Preview ready",
  failed: "Needs attention",
  paused: "Paused · progress saved",
};

export default function Home() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [previewPage, setPreviewPage] = useState("index.html");
  const [tab, setTab] = useState<Tab>("plan");
  const [stack, setStack] = useState<Stack>("html-css");
  const [filePath, setFilePath] = useState("");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [mobilePane, setMobilePane] = useState<"chat" | "workspace">("chat");
  const bottom = useRef<HTMLDivElement>(null);
  const activityBottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const activeId = useRef<string | null>(null);
  const pending = busy || !!project?.busy;
  const settings = bootstrap?.settings;

  const acceptProject = useCallback((value: Project) => {
    setProject(value);
    setProjects((previous) =>
      [
        {
          id: value.id,
          title: value.title,
          stage: value.stage,
          stack: value.stack,
          updatedAt: value.updatedAt,
          version: value.version,
        },
        ...previous.filter((p) => p.id !== value.id),
      ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    );
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const value = await api<Bootstrap>("/bootstrap");
      setBootstrap(value);
      setProjects(value.projects);
      const params = new URLSearchParams(window.location.search);
      if (params.has("new")) localStorage.removeItem("loga:last-project");
      const saved = params.has("new")
        ? null
        : params.get("project") || localStorage.getItem("loga:last-project");
      if (saved && value.projects.some((p) => p.id === saved)) {
        const selected = await api<Project>(`/projects/${saved}`);
        activeId.current = selected.id;
        setProject(selected);
        setStack(selected.stack);
        localStorage.setItem("loga:last-project", selected.id);
        const requestedView = params.get("view");
        if (
          requestedView === "files" ||
          requestedView === "preview" ||
          requestedView === "plan"
        )
          setMobilePane("workspace");
        setTab(
          selected.stage === "building"
            ? "activity"
            : requestedView === "files"
              ? "files"
              : requestedView === "plan"
                ? "plan"
                : selected.files.length
                  ? "preview"
                  : "plan",
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [project?.messages.length, pending]);
  useEffect(() => {
    activityBottom.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [project?.events.length]);
  useEffect(() => {
    if (!project?.busy) return;
    const id = project.id;
    let stopped = false;
    const poll = async () => {
      try {
        const value = await api<Project>(`/projects/${id}`);
        if (!stopped && activeId.current === id) {
          acceptProject(value);
          if (value.stage === "ready") {
            setTab("preview");
            setToast("Your website is ready to explore.");
          }
        }
      } catch (e) {
        if (!stopped) setError((e as Error).message);
      }
      if (!stopped) timer = setTimeout(poll, 1500);
    };
    let timer = setTimeout(poll, 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [project?.id, project?.busy, acceptProject]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (input.current) {
      input.current.style.height = "auto";
      input.current.style.height = `${Math.min(input.current.scrollHeight, 180)}px`;
    }
  }, [prompt]);

  function newProject() {
    if (busy) return;
    activeId.current = null;
    setProject(null);
    setPrompt("");
    setError("");
    setTab("plan");
    setStack("html-css");
    setSidebarOpen(false);
    localStorage.removeItem("loga:last-project");
    window.history.replaceState(null, "", "/");
    input.current?.focus();
  }
  async function send() {
    if (!prompt.trim() || pending || !bootstrap || project?.checkpoint) return;
    const content = prompt.trim();
    setBusy(true);
    setError("");
    setPrompt("");
    let selected = project;
    try {
      if (!selected) {
        selected = await api<Project>("/projects", "POST");
        activeId.current = selected.id;
        acceptProject(selected);
        localStorage.setItem("loga:last-project", selected.id);
      }
      acceptProject({
        ...selected,
        messages: [
          ...selected.messages,
          {
            id: "pending",
            role: "user",
            content,
            createdAt: new Date().toISOString(),
          },
        ],
        plan: null,
        stage: "discovery",
      });
      setTab("plan");
      setMobilePane("chat");
      const value = await api<Project>(
        `/projects/${selected.id}/messages`,
        "POST",
        { content },
      );
      if (activeId.current === selected.id) acceptProject(value);
    } catch (e) {
      setError((e as Error).message);
      if (selected) {
        try {
          const value = await api<Project>(`/projects/${selected.id}`);
          if (activeId.current === selected.id) {
            acceptProject(value);
            if (
              !value.messages.some(
                (m) => m.role === "user" && m.content === content,
              )
            )
              setPrompt(content);
          }
        } catch {
          setPrompt(content);
        }
      } else setPrompt(content);
    } finally {
      setBusy(false);
    }
  }
  async function makePlan() {
    if (!project || pending || project.checkpoint) return;
    setBusy(true);
    setPlanning(true);
    setError("");
    setTab("plan");
    setMobilePane("workspace");
    try {
      acceptProject(
        await api<Project>(`/projects/${project.id}/plan`, "POST", { stack }),
      );
    } catch (e) {
      setError((e as Error).message);
      try {
        const value = await api<Project>(`/projects/${project.id}`);
        if (activeId.current === project.id) acceptProject(value);
      } catch {
        /* Keep the last saved state available while offline. */
      }
    } finally {
      setBusy(false);
      setPlanning(false);
    }
  }
  async function approve() {
    if (!project || pending || stack !== project.stack) return;
    setBusy(true);
    setError("");
    try {
      acceptProject(
        await api<Project>(`/projects/${project.id}/build`, "POST", {
          approved: true,
        }),
      );
      setTab("activity");
      setMobilePane("workspace");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function retry() {
    if (!project || pending) return;
    setBusy(true);
    setError("");
    try {
      acceptProject(
        await api<Project>(
          `/projects/${project.id}/${project.checkpoint ? "continue" : "retry"}`,
          "POST",
          project.checkpoint ? { approved: true } : undefined,
        ),
      );
      setTab(project.checkpoint ? "activity" : "plan");
      if (project.checkpoint) setMobilePane("workspace");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function restore(version: number) {
    if (!project || pending) return;
    setBusy(true);
    setError("");
    try {
      const value = await api<Project>(
        `/projects/${project.id}/restore/${version}`,
        "POST",
      );
      acceptProject(value);
      setStack(value.stack);
      setToast(`Restored version ${version}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    if (!project) return;
    try {
      await exportProject(project);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function runPreview() {
    if (!project?.files.length || project.stage === "building") return;
    setPreviewPage(filePath.endsWith(".html") ? filePath : "index.html");
    setTab("preview");
    setMobilePane("workspace");
  }
  const currentFile =
    project?.files.find((f) => f.path === filePath) || project?.files[0];
  async function copy() {
    if (!currentFile) return;
    try {
      await navigator.clipboard.writeText(currentFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast("Clipboard unavailable. Select the code to copy it.");
    }
  }
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  function saveSettings(value: Settings) {
    setBootstrap((previous) =>
      previous ? { ...previous, settings: value } : previous,
    );
    setToast("Model and credentials saved.");
  }

  const composer = (welcome = false) => (
    <div className={`composer ${welcome ? "welcome-composer" : ""}`}>
      <textarea
        ref={input}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void send();
          }
        }}
        placeholder={
          welcome
            ? "Describe the website you have in mind…"
            : project?.files.length
              ? "What would you like to change?"
              : "Share your idea, colours, pages, or questions…"
        }
        aria-label="Website requirements"
        rows={welcome ? 3 : 2}
        maxLength={16000}
        disabled={pending || !bootstrap || !!project?.checkpoint}
      />
      <div className="composer-bottom">
        <button
          className="composer-model"
          onClick={() => setSettingsOpen(true)}
          disabled={!settings}
          title={
            settings
              ? `${providerNames[settings.provider]} · ${settings.model || "Choose a model"}`
              : ""
          }
        >
          <span className={`provider-mini ${settings?.provider || "mock"}`}>
            ✦
          </span>
          <span>
            {settings
              ? settings.provider === "mock"
                ? "Demo builder"
                : settings.model || `Set up ${providerNames[settings.provider]}`
              : "Connecting…"}
          </span>
          <ChevronDown size={12} />
        </button>
        <div className="composer-send">
          <span>↵ to send</span>
          <button
            aria-label="Send message"
            onClick={() => void send()}
            disabled={
              !prompt.trim() || pending || !bootstrap || !!project?.checkpoint
            }
          >
            {pending ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <ArrowUp size={18} />
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="studio-app">
      {sidebarOpen && (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`studio-sidebar ${sidebarOpen ? "open" : ""}`}>
        <button className="brand-lockup" onClick={newProject}>
          <span className="brand-mark">K</span>
          <span>
            Kimi AI Studio
            <small>AI Website Builder</small>
          </span>
          <span className="beta-tag">BETA</span>
        </button>
        <button
          className="new-project-button"
          onClick={newProject}
          disabled={busy}
        >
          <Plus size={17} />
          New Project<span>+</span>
        </button>
        <nav className="studio-navigation" aria-label="Workspace sections">
          {(
            [
              {
                label: "Conversations",
                icon: MessageSquare,
                destination: "chat",
                count:
                  project?.messages.filter((m) => m.role === "user").length ||
                  0,
              },
              {
                label: "Plans",
                icon: FileCode2,
                destination: "plan",
                count: project?.plan ? 1 : 0,
              },
              {
                label: "Files",
                icon: Folder,
                destination: "files",
                count: project?.files.length || 0,
              },
              {
                label: "Preview",
                icon: Monitor,
                destination: "preview",
                count: null,
              },
            ] as const
          ).map((item) => (
            <button
              key={item.label}
              disabled={!project}
              className={
                (
                  item.destination === "chat"
                    ? tab === "plan" && !project?.plan
                    : item.destination === tab &&
                      (tab !== "plan" || !!project?.plan)
                )
                  ? "selected"
                  : ""
              }
              onClick={() => {
                if (item.destination === "chat") {
                  setMobilePane("chat");
                  input.current?.focus();
                } else {
                  setTab(item.destination);
                  setMobilePane("workspace");
                }
                setSidebarOpen(false);
              }}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.count !== null && <small>{item.count}</small>}
            </button>
          ))}
        </nav>
        <Link className="sidebar-projects-link" href="/projects">
          <Folder size={18} />
          <span>Your projects</span>
          <small>{projects.length}</small>
          <ChevronRight size={14} />
        </Link>
        <div className="sidebar-bottom">
          <button
            className="sidebar-settings"
            onClick={() => setSettingsOpen(true)}
            disabled={!settings}
          >
            <Settings2 size={16} />
            <span>Models & settings</span>
            <span className="shortcut">⚙</span>
          </button>
          <div className="profile-row">
            <span className="avatar">L</span>
            <span>
              <strong>loga</strong>
              <small>Personal workspace</small>
            </span>
            <span
              className={`connection-dot ${bootstrap?.database ? "online" : ""}`}
              title={
                bootstrap?.database
                  ? "MongoDB connected"
                  : "Backend not connected"
              }
            />
          </div>
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-header">
          <div className="header-breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open project sidebar"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <span className="header-home">Workspace</span>
            <ChevronRight size={12} />
            <strong>{project?.title || "New website"}</strong>
            {project && (
              <span className={`stage-pill ${project.stage}`}>
                <span />
                {stages[project.stage]}
              </span>
            )}
          </div>
          <div className="header-actions">
            <StudioThemeToggle />
            {project?.files.length ? (
              <button
                className="secondary-button compact"
                onClick={() => void download()}
                disabled={project.stage === "building"}
              >
                <Download size={14} />
                <span>Export project</span>
              </button>
            ) : (
              <span className="builder-badge">
                <Sparkles size={13} /> AI Website Builder
              </span>
            )}
            <button
              className="icon-button"
              aria-label="Open model settings"
              onClick={() => setSettingsOpen(true)}
              disabled={!settings}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </header>
        <WorkflowStepper project={project} planning={planning} />
        {project?.checkpoint && !project.busy && (
          <div className="resume-banner" role="status">
            <div>
              <strong>
                Your progress is saved. Continue where you left off.
              </strong>
              <span>
                {project.checkpoint.completedPaths.length}/
                {project.checkpoint.plan.files.length} files complete
                {project.checkpoint.currentFile
                  ? ` · next: ${project.checkpoint.currentFile}`
                  : ""}
              </span>
              {project.localPath && <code>{project.localPath}</code>}
            </div>
            <button
              className="primary-button"
              onClick={() => void retry()}
              disabled={pending}
            >
              <RefreshCw size={15} />
              Continue generation
            </button>
          </div>
        )}
        {error && (
          <div className="global-error" role="alert">
            <span>{error}</span>
            <div>
              {!bootstrap && (
                <button onClick={() => void load()}>
                  <RefreshCw size={13} />
                  Reconnect
                </button>
              )}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="loading-screen">
            <Loader2 size={28} className="spin" />
            <p>Opening your workspace…</p>
          </div>
        ) : !project ? (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="welcome-badge">
                <span className="tiny-spark">✦</span> FROM FIRST THOUGHT TO
                FIRST LAUNCH
              </div>
              <h1>
                What will you
                <br />
                <span>bring to life?</span>
              </h1>
              <p className="welcome-description">
                Your idea deserves more than a blank page.
                <br />
                Let’s shape it together, then build something beautiful.
              </p>
              {composer(true)}
              <div className="welcome-flow">
                <span>
                  <MessageSquare size={13} /> Describe
                </span>
                <ChevronRight size={12} />
                <span>
                  <Layers3 size={13} /> Plan
                </span>
                <ChevronRight size={12} />
                <span>
                  <CheckCircle2 size={13} /> Approve
                </span>
                <ChevronRight size={12} />
                <span>
                  <Monitor size={13} /> Preview
                </span>
              </div>
              <div className="welcome-footer">
                <span className="mini-logo">L</span>
                <span>
                  Built around your imagination. Powered by your favourite
                  model.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mobile-pane-switch">
              <button
                className={mobilePane === "chat" ? "active" : ""}
                onClick={() => setMobilePane("chat")}
              >
                <MessageSquare size={14} />
                Conversation
              </button>
              <button
                className={mobilePane === "workspace" ? "active" : ""}
                onClick={() => setMobilePane("workspace")}
              >
                <Monitor size={14} />
                Workspace
              </button>
            </div>
            <div className={`builder-layout mobile-${mobilePane}`}>
              <section
                className="conversation-panel"
                aria-label="Website planning conversation"
              >
                <div className="conversation-header">
                  <div>
                    <span className="assistant-orb">
                      <Sparkles size={15} />
                    </span>
                    <span>
                      <strong>Your creative partner</strong>
                      <small>Let’s get the details right.</small>
                    </span>
                  </div>
                  <span className="live-label">
                    <span />
                    {pending ? "Working" : "Ready"}
                  </span>
                </div>
                <div className="messages">
                  <div className="conversation-intro">
                    <span className="intro-icon">
                      <WandSparkles size={20} />
                    </span>
                    <h3>
                      Let’s build your <span>website</span>
                    </h3>
                    <p>
                      Describe your idea and I’ll help you turn it into a
                      detailed plan, choose your design, and build it — once you
                      approve.
                    </p>
                  </div>
                  {project.messages.map((m) => (
                    <article className={`chat-message ${m.role}`} key={m.id}>
                      <div className="message-byline">
                        {m.role === "assistant" ? (
                          <span className="message-avatar">
                            <Sparkles size={12} />
                          </span>
                        ) : (
                          <span className="user-message-avatar">L</span>
                        )}
                        <strong>
                          {m.role === "assistant" ? "Kimi" : "You"}
                        </strong>
                        <time>
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <div className="message-content">{m.content}</div>
                    </article>
                  ))}
                  {pending && (
                    <div className="thinking-indicator">
                      <span />
                      <span />
                      <span />
                      <small>
                        {project.stage === "building"
                          ? "Creating your website…"
                          : "Working through the details…"}
                      </small>
                    </div>
                  )}
                  {project.error && (
                    <div className="error-box" role="alert">
                      {project.error}
                      {(project.stage === "failed" ||
                        project.stage === "paused") &&
                        project.plan && (
                          <button
                            className="text-button"
                            onClick={() => void retry()}
                            disabled={pending}
                          >
                            <RefreshCw size={13} />
                            {project.checkpoint
                              ? "Continue generation"
                              : "Review & retry"}
                          </button>
                        )}
                    </div>
                  )}
                  <div ref={bottom} />
                </div>
                <div className="chat-bottom">
                  {project.messages.some((m) => m.role === "user") &&
                    project.stage !== "building" &&
                    !project.checkpoint && (
                      <div className="review-prompt">
                        <span>
                          {project.plan
                            ? "Want to adjust the direction?"
                            : "Have the essentials? Let’s make a plan."}
                        </span>
                        <button
                          onClick={() => void makePlan()}
                          disabled={pending}
                        >
                          <Layers3 size={13} />
                          {project.plan ? "Refresh plan" : "Review plan"}
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    )}
                  {composer()}
                  <div className="chat-disclaimer">
                    {project.stage === "building"
                      ? "You can close this tab. Your build continues on the server."
                      : "Nothing gets built until you approve the plan."}
                  </div>
                </div>
              </section>
              <section
                className="workspace-panel"
                aria-label="Website build workspace"
              >
                <div className="workspace-tabs">
                  <div>
                    {(
                      [
                        { id: "plan", label: "Plan", icon: Layers3 },
                        { id: "preview", label: "Preview", icon: Monitor },
                        { id: "files", label: "Files", icon: Code2 },
                        { id: "activity", label: "Activity", icon: Activity },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        className={tab === t.id ? "active" : ""}
                        onClick={() => setTab(t.id)}
                      >
                        <t.icon size={14} />
                        {t.label}
                        {t.id === "files" && !!project.files.length && (
                          <span>{project.files.length}</span>
                        )}
                        {t.id === "activity" &&
                          project.stage === "building" && (
                            <span className="tab-live-dot" />
                          )}
                      </button>
                    ))}
                  </div>
                  {project.revisions.length > 0 && (
                    <select
                      className="version-select"
                      aria-label="Restore project version"
                      value=""
                      onChange={(e) => {
                        if (e.target.value)
                          void restore(Number(e.target.value));
                      }}
                      disabled={pending || !!project.checkpoint}
                    >
                      <option value="">
                        History · {project.version} version
                        {project.version > 1 ? "s" : ""}
                      </option>
                      {project.revisions.map((r) => (
                        <option value={r.version} key={r.version}>
                          Restore v{r.version} ·{" "}
                          {new Date(r.createdAt).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {tab === "plan" && (
                  <StudioPlan
                    project={project}
                    stack={stack}
                    setStack={setStack}
                    onApprove={() => void approve()}
                    onRegenerate={() => void makePlan()}
                    busy={pending || !!project.checkpoint}
                  />
                )}
                {tab === "preview" &&
                  (project.files.length && project.stage !== "building" ? (
                    <StudioPreview
                      key={`${project.id}-${previewPage}`}
                      project={project}
                      initialPage={previewPage}
                    />
                  ) : (
                    <div className="workspace-empty">
                      <div className="empty-orbit">
                        <Monitor size={28} />
                      </div>
                      <span className="eyebrow">THE BIG REVEAL COMES NEXT</span>
                      <h2>Your idea, made real.</h2>
                      <p>
                        {project.stage === "building"
                          ? "Your website is being created. Follow each file in the Activity tab; the preview opens when the build completes."
                          : "Review and approve your website plan. Your live, responsive preview will appear right here."}
                      </p>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          setTab(
                            project.stage === "building" ? "activity" : "plan",
                          )
                        }
                      >
                        {project.stage === "building"
                          ? "See build activity"
                          : "View your plan"}
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  ))}
                {tab === "files" &&
                  (project.files.length ? (
                    <div className="files-layout">
                      <nav className="file-tree" aria-label="Generated files">
                        <div className="file-tree-heading">
                          <Folder size={13} />
                          PROJECT FILES
                        </div>
                        {project.files.map((f) => (
                          <button
                            key={f.path}
                            className={
                              currentFile?.path === f.path ? "active" : ""
                            }
                            onClick={() => setFilePath(f.path)}
                          >
                            <FileCode2
                              size={14}
                              className={
                                f.language === "css" ? "css-file" : "js-file"
                              }
                            />
                            <span>
                              {f.path}
                              {f.status === "partial" ? " · partial" : ""}
                            </span>
                          </button>
                        ))}
                      </nav>
                      <div className="code-panel">
                        <div className="code-toolbar">
                          <span>
                            <FileCode2 size={14} />
                            {currentFile?.path}
                          </span>
                          <div className="code-toolbar-actions">
                            <button
                              className="text-button"
                              onClick={runPreview}
                              disabled={project.stage === "building"}
                            >
                              <Play size={13} />
                              Run preview
                            </button>
                            <button
                              className="text-button"
                              onClick={() => {
                                if (currentFile) downloadSource(currentFile);
                              }}
                            >
                              <Download size={13} />
                              Save file
                            </button>
                            <button
                              className="text-button"
                              onClick={() => void download()}
                              disabled={project.stage === "building"}
                            >
                              <Download size={13} />
                              Export ZIP
                            </button>
                            <button
                              className="text-button"
                              onClick={() => void copy()}
                            >
                              {copied ? (
                                <Check size={13} />
                              ) : (
                                <Copy size={13} />
                              )}{" "}
                              {copied ? "Copied" : "Copy"}
                            </button>
                          </div>
                        </div>
                        <div className="code-content">
                          <div className="line-numbers" aria-hidden="true">
                            {currentFile?.content.split("\n").map((_, i) => (
                              <div key={i}>{i + 1}</div>
                            ))}
                          </div>
                          <pre>
                            <code>{currentFile?.content}</code>
                          </pre>
                        </div>
                        <div className="code-status">
                          <span>{currentFile?.language}</span>
                          <span>
                            UTF-8 · {currentFile?.content.split("\n").length}{" "}
                            lines
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="workspace-empty">
                      <div className="empty-orbit">
                        <FileCode2 size={28} />
                      </div>
                      <h2>A place for every file.</h2>
                      <p>
                        Once you approve your plan, you’ll see the project
                        structure and each generated file here.
                      </p>
                    </div>
                  ))}
                {tab === "activity" && (
                  <div className="activity-panel">
                    <div className="activity-title">
                      <span
                        className={`activity-orb ${project.stage === "building" ? "building" : ""}`}
                      >
                        {project.stage === "building" ? (
                          <Loader2 size={22} className="spin" />
                        ) : (
                          <Activity size={22} />
                        )}
                      </span>
                      <div>
                        <span className="eyebrow">BUILD JOURNAL</span>
                        <h2>
                          {project.stage === "building"
                            ? "Bringing your plan to life."
                            : project.stage === "ready"
                              ? "From idea to working website."
                              : "Every step, in the open."}
                        </h2>
                        <p>
                          {project.stage === "building"
                            ? "Files appear here as they are created and saved."
                            : "A record of your most recent website build."}
                        </p>
                      </div>
                    </div>
                    {project.localPath && (
                      <p className="local-project-path">
                        <Folder size={14} />
                        <code>{project.localPath}</code>
                      </p>
                    )}
                    {project.events.length ? (
                      <>
                        <div className="build-progress">
                          <div
                            style={{
                              width: `${project.stage === "ready" ? 100 : Math.max(4, ((project.checkpoint?.completedPaths.length ?? project.files.length) / (project.checkpoint?.plan.files.length || project.plan?.files.length || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="activity-events">
                          {project.events.map((e) => (
                            <div
                              className={`activity-event ${e.kind}`}
                              key={e.id}
                            >
                              <span>
                                {e.kind === "success" || e.kind === "file" ? (
                                  <Check size={13} />
                                ) : e.kind === "error" ? (
                                  <X size={13} />
                                ) : (
                                  <span className="event-dot" />
                                )}
                              </span>
                              <p>{e.message}</p>
                              <time>
                                {new Date(e.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </time>
                            </div>
                          ))}
                        </div>
                        {project.stage === "ready" && (
                          <button
                            className="primary-button"
                            onClick={() => setTab("preview")}
                          >
                            Explore your website
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="activity-placeholder">
                        <span>01</span>
                        <p>
                          Start with a conversation, review your plan, then
                          approve the build. This journal will record real
                          progress as your files are created.
                        </p>
                      </div>
                    )}
                    <div ref={activityBottom} />
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
      {settingsOpen && settings && (
        <StudioSettings
          settings={settings}
          onClose={closeSettings}
          onSave={saveSettings}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
