"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";
import { Project } from "../types/studio";

export function StudioPreview({ project }: { project: Project }) {
  const [page, setPage] = useState("index.html");
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">(
    "desktop",
  );
  const [reload, setReload] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);
  const htmlFiles = project.files.filter((f) => f.path.endsWith(".html"));
  const activePage = project.files.some((f) => f.path === page)
    ? page
    : htmlFiles[0]?.path || "index.html";
  const previewStack = project.files.some((f) => f.path === "App.js")
    ? "react"
    : "html-css";
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        event.data?.type !== "loga:navigate" ||
        typeof event.data.path !== "string"
      )
        return;
      if (
        project.files.some(
          (f) => f.path === event.data.path && f.path.endsWith(".html"),
        )
      )
        setPage(event.data.path);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [project.files]);
  const html = useMemo(() => {
    if (previewStack === "react" || typeof window === "undefined") return "";
    const source =
      project.files.find((f) => f.path === activePage)?.content || "";
    const doc = new DOMParser().parseFromString(source, "text/html");
    const resolve = (path: string) => {
      try {
        const url = new URL(path, `https://preview.local/${activePage}`);
        return url.origin === "https://preview.local"
          ? decodeURIComponent(url.pathname.slice(1))
          : null;
      } catch {
        return null;
      }
    };
    doc.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const local = project.files.find(
        (f) => f.path === resolve(link.getAttribute("href") || ""),
      );
      if (local) {
        const style = doc.createElement("style");
        style.textContent = local.content;
        link.replaceWith(style);
      }
    });
    doc.querySelectorAll("script[src]").forEach((script) => {
      const local = project.files.find(
        (f) => f.path === resolve(script.getAttribute("src") || ""),
      );
      if (local) {
        const inline = doc.createElement("script");
        inline.textContent = `document.addEventListener('DOMContentLoaded',()=>{\n${local.content}\n});`;
        script.replaceWith(inline);
      }
    });
    doc.querySelectorAll("img[src]").forEach((img) => {
      const local = project.files.find(
        (f) => f.path === resolve(img.getAttribute("src") || ""),
      );
      if (local?.path.endsWith(".svg"))
        img.setAttribute(
          "src",
          `data:image/svg+xml,${encodeURIComponent(local.content)}`,
        );
    });
    const bridge = doc.createElement("script");
    bridge.textContent = `document.addEventListener('click',function(e){const a=e.target.closest('a');if(!a)return;const raw=a.getAttribute('href');if(!raw||raw.startsWith('#'))return;try{const u=new URL(raw,'https://preview.local/${activePage}');if(u.origin==='https://preview.local'){e.preventDefault();let p=decodeURIComponent(u.pathname.slice(1));if(!p||p.endsWith('/'))p+='index.html';parent.postMessage({type:'loga:navigate',path:p},'*');}else{a.target='_blank';a.rel='noopener noreferrer';}}catch{}});`;
    doc.head.appendChild(bridge);
    return "<!doctype html>\n" + doc.documentElement.outerHTML;
  }, [project.files, activePage, previewStack]);
  const reactFiles = useMemo(
    () =>
      Object.fromEntries(project.files.map((f) => [`/${f.path}`, f.content])),
    [project.files],
  );
  return (
    <div className="preview-shell">
      <div className="browser-toolbar">
        <div className="browser-controls">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-address">
          <span className="live-dot" />
          {project.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .slice(0, 32)}
          .preview
          {previewStack !== "react" && activePage !== "index.html"
            ? `/${activePage}`
            : ""}
        </div>
        <div className="device-buttons">
          {(["desktop", "tablet", "mobile"] as const).map((d, i) => (
            <button
              key={d}
              className={`icon-button ${device === d ? "active" : ""}`}
              aria-label={`${d} preview`}
              onClick={() => setDevice(d)}
            >
              {i === 0 ? (
                <Monitor size={15} />
              ) : i === 1 ? (
                <Tablet size={15} />
              ) : (
                <Smartphone size={15} />
              )}
            </button>
          ))}
          <span className="toolbar-divider" />
          <button
            className="icon-button"
            aria-label="Reload preview"
            onClick={() => setReload((n) => n + 1)}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
      {previewStack !== "react" && htmlFiles.length > 1 && (
        <div className="page-tabs">
          {htmlFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => setPage(file.path)}
              className={activePage === file.path ? "active" : ""}
            >
              {file.path === "index.html"
                ? "Home"
                : file.path.replace(".html", "").split("/").pop()}
            </button>
          ))}
        </div>
      )}
      <div className={`preview-stage ${device}`}>
        <div className="preview-viewport" key={`${project.id}-${reload}`}>
          {previewStack === "react" ? (
            <SandpackProvider
              template="react"
              files={reactFiles}
              theme="dark"
              options={{ autorun: true, recompileMode: "delayed" }}
            >
              <SandpackPreview
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                style={{ height: "100%", minHeight: 500 }}
              />
            </SandpackProvider>
          ) : (
            <iframe
              ref={frame}
              title={`${project.title} website preview`}
              srcDoc={html}
              sandbox="allow-scripts allow-forms allow-popups"
            />
          )}
        </div>
      </div>
      <div className="preview-footnote">
        <span>
          <span className="live-dot" /> Live preview
        </span>
        <span>
          {previewStack === "react"
            ? "React sandbox · internet required"
            : "Isolated browser sandbox"}{" "}
          ·{" "}
          {device === "desktop"
            ? "Responsive"
            : device === "tablet"
              ? "768px"
              : "390px"}
        </span>
      </div>
    </div>
  );
}
