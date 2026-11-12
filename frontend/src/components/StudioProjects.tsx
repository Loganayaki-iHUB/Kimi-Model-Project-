"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Code2,
  Download,
  FileCode2,
  Folder,
  Globe2,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { api } from "../lib/studio-api";
import { exportProject } from "../lib/project-export";
import { Bootstrap, Project, ProjectSummary } from "../types/studio";
import { StudioThemeToggle } from "./StudioTheme";

const statusLabels: Record<Project["stage"], string> = {
  discovery: "Draft",
  planning: "Planning",
  review: "Plan ready",
  building: "Building",
  ready: "Ready to run",
  failed: "Needs attention",
  paused: "Paused · saved",
};
export default function ProjectsPage() {
  const [items, setItems] = useState<ProjectSummary[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const value = await api<Bootstrap>("/bootstrap");
      setItems(value.projects);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function download(id: string) {
    setExporting(id);
    setError("");
    try {
      await exportProject(await api<Project>(`/projects/${id}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(null);
    }
  }
  const visible = items.filter(
    (p) =>
      `${p.title} ${p.description || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "drafts"
          ? !p.version && p.stage !== "ready"
          : p.stage === filter)),
  );
  return (
    <div className="studio-app library-app">
      <aside className="studio-sidebar library-sidebar">
        <Link className="brand-lockup" href="/">
          <span className="brand-mark">K</span>
          <span>
            Kimi AI Studio<small>AI Website Builder</small>
          </span>
        </Link>
        <Link className="new-project-button" href="/?new=1">
          <Plus size={17} />
          New Project
        </Link>
        <nav className="studio-navigation" aria-label="Workspace navigation">
          <Link href="/">
            <ArrowLeft size={17} />
            <span>Back to workspace</span>
          </Link>
          <Link href="/projects" className="selected" aria-current="page">
            <Folder size={18} />
            <span>Your projects</span>
            <small>{items.length}</small>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row">
            <span className="avatar">L</span>
            <span>
              <strong>loga</strong>
              <small>Personal workspace</small>
            </span>
          </div>
        </div>
      </aside>
      <main className="studio-main">
        <header className="studio-header">
          <div className="header-breadcrumb">
            <Link href="/" className="library-back-link">
              <ArrowLeft size={15} />
              Workspace
            </Link>
            <span>/</span>
            <strong>Your projects</strong>
          </div>
          <div className="header-actions"><StudioThemeToggle /><Link className="primary-button compact" href="/?new=1">
            <Plus size={14} />
            New Project
          </Link></div>
        </header>
        <div className="library-content">
          <div className="library-title">
            <div>
              <span className="eyebrow">YOUR CREATIVE WORKSPACE</span>
              <h1>
                Your projects<span>.</span>
              </h1>
              <p>
                Pick up where you left off. Open the code, run a preview, or
                take your project with you.
              </p>
            </div>
            <button
              className="secondary-button compact"
              onClick={() => void load()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              Refresh
            </button>
          </div>
          <div className="library-controls">
            <label className="library-search">
              <Search size={17} />
              <input
                aria-label="Search saved projects"
                placeholder="Search your projects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter projects by status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All projects</option>
              <option value="ready">Ready to run</option>
              <option value="paused">Paused</option>
              <option value="drafts">Drafts</option>
            </select>
            <span>
              {visible.length} project{visible.length === 1 ? "" : "s"}
            </span>
          </div>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {loading ? (
            <div className="library-loading">
              <Loader2 size={25} className="spin" />
              <p>Loading saved projects…</p>
            </div>
          ) : visible.length ? (
            <div className="library-grid">
              {visible.map((p, index) => {
                const href = `/?project=${encodeURIComponent(p.id)}`;
                const hasFiles = !!p.fileCount;
                return (
                  <article className="library-card" key={p.id}>
                    <Link
                      className={`library-card-cover cover-${index % 3}`}
                      href={`${href}&view=${hasFiles ? "files" : "plan"}`}
                      aria-label={`Open ${p.title}`}
                      style={
                        {
                          "--cover-accent": p.colors?.[0]?.hex || "#9270e9",
                        } as React.CSSProperties
                      }
                    >
                      <div className="cover-browser">
                        <div className="cover-browser-dots">
                          <i />
                          <i />
                          <i />
                        </div>
                        <div className="cover-layout">
                          <div className="cover-nav">
                            <span />
                            <span />
                            <span />
                          </div>
                          <div className="cover-hero">
                            <div>
                              <span />
                              <span />
                              <span />
                              <b />
                            </div>
                            <div className="cover-art">
                              <Globe2 size={30} />
                            </div>
                          </div>
                          <div className="cover-cards">
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      </div>
                      <span className={`project-status ${p.stage}`}>
                        {p.stage === "building" && (
                          <Loader2 size={11} className="spin" />
                        )}
                        {statusLabels[p.stage]}
                      </span>
                    </Link>
                    <div className="library-card-body">
                      <Link
                        href={`${href}&view=${hasFiles ? "files" : "plan"}`}
                        className="library-card-title"
                      >
                        <h2>{p.title}</h2>
                        <ArrowRight size={17} />
                      </Link>
                      <p>
                        {p.description ||
                          "Your saved conversation and website brief. Open the workspace to continue planning."}
                      </p>
                      <div className="library-card-meta">
                        <span>
                          <Code2 size={12} />
                          {p.stack === "react" ? "React" : "HTML + CSS"}
                        </span>
                        <span>
                          <FileCode2 size={12} />
                          {p.fileCount || 0} files
                        </span>
                        {p.version > 0 && <span>v{p.version}</span>}
                      </div>
                      <time dateTime={p.updatedAt}>
                        Updated{" "}
                        {new Date(p.updatedAt).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <div className="library-card-actions">
                      <Link
                        href={`${href}&view=${hasFiles ? "files" : "plan"}`}
                        className="secondary-button compact"
                      >
                        <Code2 size={13} />
                        {hasFiles ? "Open files" : "Open project"}
                      </Link>
                      {hasFiles && (
                        <>
                          <Link
                            href={`${href}&view=preview`}
                            className="primary-button compact"
                          >
                            <Play size={13} />
                            Run
                          </Link>
                          <button
                            className="icon-button"
                            disabled={
                              exporting !== null || p.stage === "building"
                            }
                            aria-label={`Export ${p.title} as ZIP`}
                            title="Export project ZIP"
                            onClick={() => void download(p.id)}
                          >
                            {exporting === p.id ? (
                              <Loader2 size={16} className="spin" />
                            ) : (
                              <Download size={16} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="library-empty">
              <Folder size={36} />
              <h2>
                {items.length
                  ? "No matching projects"
                  : "Your next idea starts here."}
              </h2>
              <p>
                {items.length
                  ? "Try another search or status filter."
                  : "Create your first website. Your saved projects will appear here."}
              </p>
              {items.length ? (
                <button
                  className="secondary-button"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link href="/?new=1" className="primary-button">
                  <Plus size={15} />
                  Create a website
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
