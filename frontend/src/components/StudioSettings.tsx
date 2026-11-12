"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Pencil,
  Loader2,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "../lib/studio-api";
import { Provider, Settings, providerNames } from "../types/studio";

const descriptions: Record<Provider, string> = {
  mock: "Explore the full workflow without a key.",
  gemini: "Build with Google’s generative models.",
  kimi: "Connect directly to Moonshot AI.",
  openrouter: "One key. A world of language models.",
};
export function StudioSettings({
  settings,
  onClose,
  onSave,
}: {
  settings: Settings;
  onClose: () => void;
  onSave: (s: Settings) => void;
}) {
  const [showForm, setShowForm] = useState(!settings.profiles?.length);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [connectionName, setConnectionName] = useState("");
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [activating, setActivating] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider>(settings.provider);
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const [model, setModel] = useState(settings.model);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [current, setCurrent] = useState(settings);
  const dialog = useRef<HTMLDivElement>(null);
  const generation = useRef(0);
  const available = {
    ...current.providers[provider],
    hasKey:
      current.providers[provider].hasKey ||
      !!current.profiles?.some(
        (p) => p.id === editingId && p.provider === provider,
      ),
  };
  async function fetchModels(p: Provider, apiKey = "") {
    const request = ++generation.current;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ models: { id: string; name: string }[] }>(
        "/settings/models",
        "POST",
        { provider: p, apiKey, ...(editingId ? { profileId: editingId } : {}) },
      );
      if (request !== generation.current) return;
      setModels(result.models);
      if (!result.models.length)
        setNotice("No models were returned. You can enter a model ID below.");
    } catch (e) {
      if (request === generation.current) setError((e as Error).message);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    setKey("");
    setVisible(false);
    setModels([]);
    setError("");
    setNotice("");
    setSearch("");
    setLoading(false);
    const edited = current.profiles?.find((p) => p.id === editingId);
    setConnectionName(edited?.name || "");
    setModel(
      edited?.model ||
        (provider === "mock"
          ? "demo-builder"
          : current.models[provider] ||
            (provider === current.provider ? current.model : "")),
    );
    if (provider === "mock" || available.hasKey) void fetchModels(provider);
    return () => {
      generation.current++;
    };
    // Discovery follows the edited connection; revealing a key is a separate explicit request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, editingId]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    dialog.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose, saving]);
  async function save(activate = true) {
    setSaving(true);
    setError("");
    try {
      const value = await api<Settings>("/settings", "PUT", {
        provider,
        model,
        activate,
        ...(editingId ? { profileId: editingId } : {}),
        ...(connectionName.trim() ? { name: connectionName.trim() } : {}),
        ...(key ? { apiKey: key } : {}),
      });
      setCurrent(value);
      setKey("");
      setRevealed({});
      setShowForm(false);
      setNotice(
        activate
          ? "Connection saved and activated."
          : "Key and model saved as a connection card.",
      );
      onSave(value);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function test() {
    setTesting(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ message: string }>("/settings/test", "POST", {
        provider,
        model,
        apiKey: key,
        ...(editingId ? { profileId: editingId } : {}),
      });
      setNotice(result.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setTesting(false);
    }
  }
  async function activateProfile(id: string) {
    setActivating(id);
    setError("");
    try {
      const value = await api<Settings>(
        `/settings/profiles/${id}/activate`,
        "POST",
      );
      setCurrent(value);
      onSave(value);
      setNotice(
        "Active connection updated. New requests use this key and model.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActivating(null);
    }
  }
  async function revealProfile(id: string) {
    if (revealed[id]) {
      setRevealed((previous) => {
        const next = { ...previous };
        delete next[id];
        return next;
      });
      return;
    }
    try {
      const value = await api<{ apiKey: string }>(
        `/settings/profiles/${id}/reveal`,
        "POST",
      );
      setRevealed((previous) => ({ ...previous, [id]: value.apiKey }));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!Object.keys(revealed).length) return;
    const timer = setTimeout(() => setRevealed({}), 30000);
    return () => clearTimeout(timer);
  }, [revealed]);
  useEffect(() => {
    if (!showForm) return;
    const field = document.getElementById("connection-name");
    field?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [showForm, editingId]);
  function addConnection() {
    setEditingId(undefined);
    setConnectionName("");
    setKey("");
    setVisible(false);
    setShowForm(true);
    setError("");
    setNotice("");
  }
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        ref={dialog}
        tabIndex={-1}
      >
        <header className="modal-header">
          <div>
            <span className="eyebrow">YOUR WORKSPACE</span>
            <h2 id="settings-title">Models & credentials</h2>
            <p>Your model. Your key. Your creative process.</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={19} />
          </button>
        </header>
        <div className="settings-body">
          <div className="connections-heading">
            <div>
              <h3>Saved connections</h3>
              <p>
                Keep your keys and models together. Choose one to power your
                workspace.
              </p>
            </div>
            <button
              className="primary-button compact"
              onClick={addConnection}
              disabled={saving}
            >
              <Plus size={15} />
              Add key
            </button>
          </div>
          <div className="connection-cards">
            <article
              className={`connection-card ${current.provider === "mock" ? "is-active" : ""}`}
            >
              <div className="connection-card-top">
                <span className="provider-symbol mock">K</span>
                <div>
                  <h4>Demo builder</h4>
                  <p>No API key required · starter templates</p>
                </div>
                {current.provider === "mock" && (
                  <span className="active-connection-badge">
                    <CheckCircle2 size={12} />
                    Active
                  </span>
                )}
              </div>
              {current.provider !== "mock" && (
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      const value = await api<Settings>("/settings", "PUT", {
                        provider: "mock",
                        model: "demo-builder",
                      });
                      setCurrent(value);
                      onSave(value);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Use demo builder
                </button>
              )}
            </article>
            {(current.profiles || []).map((profile) => (
              <article
                className={`connection-card ${current.activeProfileId === profile.id && current.provider !== "mock" ? "is-active" : ""}`}
                key={profile.id}
              >
                <div className="connection-card-top">
                  <span className={`provider-symbol ${profile.provider}`}>
                    {profile.provider === "gemini"
                      ? "✦"
                      : profile.provider === "kimi"
                        ? "K"
                        : "↗"}
                  </span>
                  <div>
                    <h4>{profile.name}</h4>
                    <p>{providerNames[profile.provider]}</p>
                  </div>
                  {current.activeProfileId === profile.id &&
                    current.provider !== "mock" && (
                      <span className="active-connection-badge">
                        <CheckCircle2 size={12} />
                        Active
                      </span>
                    )}
                </div>
                <div className="saved-model-row">
                  <span>MODEL</span>
                  <code>{profile.model || "Select a model"}</code>
                </div>
                <div className="saved-key-row">
                  <KeyRound size={14} />
                  <code>
                    {revealed[profile.id] || `••••••••••••${profile.last4}`}
                  </code>
                  <button
                    className="icon-button"
                    aria-label={`${revealed[profile.id] ? "Hide" : "Reveal"} saved key for ${profile.name}`}
                    onClick={() => void revealProfile(profile.id)}
                  >
                    {revealed[profile.id] ? (
                      <EyeOff size={15} />
                    ) : (
                      <Eye size={15} />
                    )}
                  </button>
                </div>
                <div className="connection-card-actions">
                  <button
                    className="text-button"
                    onClick={() => {
                      setProvider(profile.provider);
                      setEditingId(profile.id);
                      setShowForm(true);
                      setNotice("");
                    }}
                  >
                    <Pencil size={12} />
                    Edit key / model
                  </button>
                  <button
                    className="secondary-button compact"
                    disabled={
                      !profile.model ||
                      activating !== null ||
                      current.activeProfileId === profile.id
                    }
                    onClick={() => void activateProfile(profile.id)}
                  >
                    {activating === profile.id ? (
                      <Loader2 size={13} className="spin" />
                    ) : (
                      <CheckCircle2 size={13} />
                    )}{" "}
                    {current.activeProfileId === profile.id
                      ? "In use"
                      : "Activate"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {showForm && (
            <div className="connection-editor">
              <div className="connection-editor-title">
                <h3>{editingId ? "Edit connection" : "Add a connection"}</h3>
                <button
                  className="icon-button"
                  aria-label="Close connection editor"
                  onClick={() => setShowForm(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <label className="field-label" htmlFor="connection-name">
                Connection name
              </label>
              <input
                id="connection-name"
                className="text-input"
                placeholder="For example, Gemini · design model"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                maxLength={80}
              />
              <div className="section-label">
                <span>01</span> Choose your provider
              </div>
              <div className="provider-grid">
                {(Object.keys(providerNames) as Provider[]).map((p) => (
                  <button
                    key={p}
                    className={`provider-card ${provider === p ? "selected" : ""}`}
                    onClick={() => {
                      setEditingId(undefined);
                      setProvider(p);
                    }}
                  >
                    <span className={`provider-symbol ${p}`}>
                      {p === "gemini"
                        ? "✦"
                        : p === "kimi"
                          ? "K"
                          : p === "openrouter"
                            ? "↗"
                            : "L"}
                    </span>
                    <span>
                      <strong>{providerNames[p]}</strong>
                      <small>{descriptions[p]}</small>
                    </span>
                    {provider === p && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
              {provider !== "mock" && (
                <>
                  <div className="section-label">
                    <span>02</span> Connect your API key{" "}
                    {available.hasKey && (
                      <span className="saved-indicator">
                        <Check size={12} />{" "}
                        {available.source === "environment"
                          ? "From .env"
                          : "Saved"}
                      </span>
                    )}
                  </div>
                  <label className="field-label" htmlFor="api-key">
                    {providerNames[provider]} API key
                  </label>
                  <div className="key-input">
                    <KeyRound size={16} />
                    <input
                      id="api-key"
                      type={visible ? "text" : "password"}
                      value={key}
                      onChange={(e) => {
                        setKey(e.target.value);
                        setNotice("");
                      }}
                      onBlur={() => {
                        if (key.trim()) void fetchModels(provider, key.trim());
                      }}
                      placeholder={
                        available.hasKey
                          ? `Saved key ending in ${available.last4} · enter to replace`
                          : "Paste your API key"
                      }
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      className="icon-button"
                      onClick={() => setVisible(!visible)}
                      aria-label={visible ? "Hide API key" : "Show API key"}
                    >
                      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className="field-help">
                    <span>
                      <ShieldCheck size={13} /> Encrypted in MongoDB. Reveal a
                      saved key using its card?s eye button.
                    </span>
                  </div>
                </>
              )}
              <div className="model-heading">
                <div className="section-label">
                  <span>{provider === "mock" ? "02" : "03"}</span> Select a
                  model
                </div>
                <button
                  className="text-button"
                  disabled={
                    loading ||
                    (provider !== "mock" && !key && !available.hasKey)
                  }
                  onClick={() => void fetchModels(provider, key)}
                >
                  <RefreshCw size={13} className={loading ? "spin" : ""} />{" "}
                  {loading ? "Fetching models…" : "Refresh live models"}
                </button>
              </div>
              {models.length > 0 && (
                <>
                  <input
                    className="text-input model-search"
                    aria-label="Search available models"
                    placeholder={`Search ${models.length} available models…`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="model-options">
                    {models
                      .filter((m) =>
                        `${m.name} ${m.id}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                      )
                      .slice(0, 80)
                      .map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setModel(m.id)}
                          className={model === m.id ? "selected" : ""}
                        >
                          <span>
                            <strong>{m.name}</strong>
                            <small>{m.id}</small>
                          </span>
                          {model === m.id ? (
                            <Check size={15} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                        </button>
                      ))}
                  </div>
                </>
              )}
              <label className="field-label" htmlFor="model-id">
                {models.length ? "Selected model ID" : "Model ID"}
              </label>
              <input
                className="text-input"
                id="model-id"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={
                  provider === "mock"
                    ? "demo-builder"
                    : "Select a model above or enter its exact ID"
                }
                readOnly={provider === "mock"}
              />
              <p className="muted small">
                Model lists are fetched from the provider. You can also enter a
                model ID manually.
              </p>
              {provider === "mock" && (
                <div className="info-box">
                  Demo mode lets you try planning, approval and preview with a
                  starter template. Connect a provider for AI conversations and
                  custom websites.
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="success-box" role="status">
              <CheckCircle2 size={15} />
              {notice}
            </div>
          )}
        </div>
        <footer className="modal-footer">
          <span className="muted small">Personal workspace · loga</span>
          <div>
            {showForm && (
              <>
                <button
                  className="secondary-button"
                  onClick={test}
                  disabled={
                    testing ||
                    saving ||
                    !model ||
                    (provider !== "mock" && !key && !available.hasKey)
                  }
                >
                  {testing ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <ShieldCheck size={15} />
                  )}
                  Test connection
                </button>
                {provider !== "mock" && (
                  <button
                    className="secondary-button"
                    onClick={() => void save(false)}
                    disabled={
                      saving || testing || !model || (!key && !available.hasKey)
                    }
                  >
                    Save card
                  </button>
                )}
                <button
                  className="primary-button"
                  onClick={() => void save(true)}
                  disabled={
                    saving ||
                    testing ||
                    !model ||
                    (provider !== "mock" && !key && !available.hasKey)
                  }
                >
                  {saving ? (
                    <Loader2 size={15} className="spin" />
                  ) : (
                    <Check size={15} />
                  )}
                  Save & activate
                </button>
              </>
            )}
            {!showForm && (
              <button className="primary-button" onClick={onClose}>
                <Check size={15} />
                Done
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
