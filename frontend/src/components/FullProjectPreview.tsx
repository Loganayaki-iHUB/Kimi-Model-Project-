"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { api } from "../lib/studio-api";
import { Project } from "../types/studio";
import { StudioPreview } from "./StudioPreview";
import { StudioThemeToggle } from "./StudioTheme";

export function FullProjectPreview() {
  const [project, setProject] = useState<Project | null>(null);
  const [projectId, setProjectId] = useState("");
  const [page, setPage] = useState("index.html");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams(window.location.search);
    const id = query.get("project") || "";
    setProjectId(id);
    setPage(query.get("page") || "index.html");
    setLoading(true);
    setError("");
    if (!id) {
      setError("Open a project preview from the studio to get started.");
      setLoading(false);
      return;
    }
    void api<Project>(`/projects/${encodeURIComponent(id)}`).then(value => {
      if (!cancelled) setProject(value);
    }).catch(failure => {
      if (!cancelled) setError(failure instanceof Error ? failure.message : "Unable to load this preview.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);

  return <main className="full-preview-page">
    <header className="full-preview-header">
      <Link href={projectId ? `/?${new URLSearchParams({ project: projectId, view: "preview" })}` : "/"} className="secondary-button"><ArrowLeft size={16} />Back to studio</Link>
      <div><strong>{project?.title || "Website preview"}</strong><span>Kimi AI Studio</span></div>
      <StudioThemeToggle />
    </header>
    {loading ? <div className="full-preview-state" role="status"><Loader2 className="spin" size={20} />Loading preview...</div>
      : error ? <div className="full-preview-state" role="alert"><p>{error}</p><button type="button" className="secondary-button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={16} />Retry</button></div>
      : project?.files.length ? <StudioPreview key={project.id} project={project} initialPage={page} fullPage />
      : <div className="full-preview-state">This project does not have generated preview files yet.</div>}
  </main>;
}
