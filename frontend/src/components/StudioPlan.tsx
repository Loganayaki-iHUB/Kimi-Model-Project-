"use client";

import {
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  FileCode2,
  Info,
  Layers3,
  Loader2,
  Palette,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Project, Stack } from "../types/studio";

export function StudioPlan({
  project,
  stack,
  setStack,
  onApprove,
  onRegenerate,
  busy,
}: {
  project: Project;
  stack: Stack;
  setStack: (s: Stack) => void;
  onApprove: () => void;
  onRegenerate: () => void;
  busy: boolean;
}) {
  const plan = project.plan;
  const canApprove =
    !!plan && project.stage === "review" && stack === project.stack;
  return (
    <div className="plan-container blueprint-card">
      <div className="blueprint-heading">
        <span className="blueprint-icon">
          <FileCode2 size={22} />
        </span>
        <div>
          <h2>Website Plan</h2>
          <p>
            {plan
              ? "A complete plan based on your idea. Review the details, choose your stack, then approve to start creating."
              : "Your idea takes shape here. Share your requirements, then review your plan before anything is built."}
          </p>
        </div>
        <span className={`draft-badge ${canApprove ? "ready" : ""}`}>
          <span />
          {canApprove
            ? "Ready to build"
            : plan
              ? "Website blueprint"
              : "Draft Plan"}
        </span>
      </div>
      <div className="plan-scroll">
        {plan ? (
          <>
            <div className="blueprint-project-title">
              <h3>{plan.title}</h3>
              <p>{plan.description}</p>
            </div>
            <details className="blueprint-disclosure" open>
              <summary>
                <FileCode2 size={20} />
                <span>
                  <strong>Pages ({plan.pages.length})</strong>
                  <small>{plan.pages.map((p) => p.name).join(", ")}</small>
                </span>
                <ChevronRight size={16} />
              </summary>
              <div className="blueprint-disclosure-content">
                {plan.pages.map((page, i) => (
                  <div className="blueprint-page" key={`${page.path}-${i}`}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>
                        {page.name}
                        <code>{page.path}</code>
                      </strong>
                      <p>{page.sections.join(" · ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
            <details className="blueprint-disclosure">
              <summary>
                <Layers3 size={20} />
                <span>
                  <strong>Features & interactions</strong>
                  <small>{plan.features.join(", ")}</small>
                </span>
                <ChevronRight size={16} />
              </summary>
              <div className="blueprint-disclosure-content feature-list">
                {plan.features.map((feature, i) => (
                  <div key={i}>
                    <span>
                      <Check size={12} />
                    </span>
                    {feature}
                  </div>
                ))}
              </div>
            </details>
            <details className="blueprint-disclosure">
              <summary>
                <Sparkles size={20} />
                <span>
                  <strong>Design direction</strong>
                  <small>{plan.visualDirection}</small>
                </span>
                <ChevronRight size={16} />
              </summary>
              <div className="blueprint-disclosure-content design-direction">
                <p>{plan.visualDirection}</p>
                <strong>Typography</strong>
                <p>{plan.typography}</p>
                <strong>Audience</strong>
                <p>{plan.audience}</p>
                <strong>Responsive layout</strong>
                <p>{plan.responsive}</p>
              </div>
            </details>
            <section className="blueprint-palette">
              <h3>
                <Palette size={20} />
                Color Palette
              </h3>
              <div className="palette-rows">
                {plan.colors.map((color, i) => (
                  <div key={`${color.hex}-${i}`}>
                    <span
                      className="palette-chip"
                      style={{ background: color.hex }}
                    />
                    <strong>{color.name}</strong>
                    <code>{color.hex.toUpperCase()}</code>
                    <small>{color.usage}</small>
                  </div>
                ))}
              </div>
            </section>
            <details className="blueprint-disclosure">
              <summary>
                <Code2 size={20} />
                <span>
                  <strong>Project structure ({plan.files.length} files)</strong>
                  <small>{plan.files.map((f) => f.path).join(", ")}</small>
                </span>
                <ChevronRight size={16} />
              </summary>
              <div className="blueprint-disclosure-content proposed-files">
                {plan.files.map((file) => (
                  <div key={file.path}>
                    <FileCode2 size={14} />
                    <code>{file.path}</code>
                    <span>{file.purpose}</span>
                  </div>
                ))}
              </div>
            </details>
          </>
        ) : (
          <div className="draft-outline">
            {[
              {
                icon: FileCode2,
                title: "Pages & structure",
                text: "Your pages, sections and navigation",
              },
              {
                icon: Layers3,
                title: "Features & interactions",
                text: "The experiences your visitors will use",
              },
              {
                icon: Palette,
                title: "Color palette & design",
                text: "Your colours, typography and visual direction",
              },
              {
                icon: Code2,
                title: "Project structure",
                text: "A clear plan for every generated file",
              },
            ].map((row) => (
              <div className="draft-outline-row" key={row.title}>
                <row.icon size={20} />
                <span>
                  <strong>{row.title}</strong>
                  <small>{row.text}</small>
                </span>
                <span className="draft-pending">Pending</span>
              </div>
            ))}
            <div className="draft-callout">
              <Sparkles size={22} />
              <p>
                A little conversation.
                <br />
                <strong>A clear direction.</strong>
              </p>
              <span>
                Tell me about your website, then choose <b>Review plan</b> in
                the conversation.
              </span>
            </div>
          </div>
        )}
        <section className="stack-section">
          <h3>
            <Layers3 size={18} />
            Choose Tech Stack <small>(generation starts after approval)</small>
          </h3>
          <div className="stack-options">
            {(
              [
                {
                  id: "html-css",
                  title: "HTML + CSS",
                  subtitle: "Lightweight & fast",
                  symbol: "</>",
                },
                {
                  id: "react",
                  title: "React",
                  subtitle: "Interactive experiences",
                  symbol: "⚛",
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                className={stack === option.id ? "selected" : ""}
                disabled={busy}
                onClick={() => setStack(option.id)}
                aria-pressed={stack === option.id}
              >
                <span className={`stack-symbol ${option.id}`}>
                  {option.symbol}
                </span>
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.subtitle}</small>
                </span>
                {stack === option.id && <CheckCircle2 size={14} />}
              </button>
            ))}
          </div>
          {plan && stack !== project.stack && (
            <p className="stack-change-note">
              Update the plan to use your selected stack before building.
            </p>
          )}
        </section>
      </div>
      <div className="blueprint-actions">
        <div>
          <button
            className="primary-button"
            disabled={busy || !plan}
            onClick={canApprove ? onApprove : onRegenerate}
          >
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : canApprove ? (
              <Play size={16} />
            ) : (
              <RefreshCw size={16} />
            )}{" "}
            {canApprove
              ? "Approve Plan & Start Build"
              : !plan
                ? "Awaiting Your Requirements"
                : stack !== project.stack
                ? "Update Plan for This Stack"
                : "Create Updated Plan"}
          </button>
          {plan && (
            <button
              className="secondary-button"
              onClick={onRegenerate}
              disabled={busy}
              title="Generate a revised plan from the conversation"
            >
              <RefreshCw size={16} />
              Revise Plan
            </button>
          )}
        </div>
        <p>
          <Info size={14} />
          {plan
            ? "Generation will not start until you approve the plan."
            : "Your blueprint appears after you review your requirements."}
        </p>
      </div>
    </div>
  );
}
