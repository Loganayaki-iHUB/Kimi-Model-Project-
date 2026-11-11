import {
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Layers3,
  MessageSquare,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { Project } from "../types/studio";

const steps = [
  { label: "Collecting requirements", icon: MessageSquare },
  { label: "Reviewing plan", icon: Layers3 },
  { label: "Awaiting approval", icon: CheckCircle2 },
  { label: "Building", icon: Code2 },
  { label: "Ready for preview", icon: Monitor },
  { label: "Revising", icon: RefreshCw },
];

export function WorkflowStepper({
  project,
  planning,
}: {
  project: Project | null;
  planning: boolean;
}) {
  const active = planning
    ? 1
    : !project
      ? 0
      : project.stage === "building" || project.stage === "failed"
        ? 3
        : project.stage === "ready"
          ? 4
          : project.stage === "review"
            ? 2
            : project.version > 0
              ? 5
              : 0;
  return (
    <nav className="workflow-stepper" aria-label="Website creation progress">
      <ol>
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={`${index === active ? "current" : ""} ${index < active && active !== 5 ? "completed" : ""}`}
            aria-current={index === active ? "step" : undefined}
          >
            <span className="workflow-step">
              <span className="workflow-icon">
                {index < active && active !== 5 ? (
                  <Check size={17} />
                ) : (
                  <step.icon size={18} />
                )}
              </span>
              <span>{step.label}</span>
            </span>
            {index < steps.length - 1 && (
              <ChevronRight size={15} className="workflow-arrow" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
