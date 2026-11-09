'use client';

import {
  ArrowRight,
  ArrowUp,
  Box,
  ChevronDown,
  ChevronRight,
  Code2,
  Copy,
  ExternalLink,
  Eye,
  FileCode,
  FolderOpen,
  Hammer,
  HelpCircle,
  Lightbulb,
  Loader2,
  Maximize2,
  Mic,
  Monitor,
  PanelLeft,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { MyKimiView } from '../components/MyKimiView';
import { PluginsView } from '../components/PluginsView';
import { Sidebar } from '../components/Sidebar';
import { checkBackendHealth, generateProject } from '../lib/api';
import { GeneratedProject } from '../types/generation';

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('chat');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Model & mode toggles
  const [selectedModel, setSelectedModel] = useState('K3.1 Pro');
  const [modelSpeed, setModelSpeed] = useState('High');

  const [backendHealth, setBackendHealth] = useState<{
    connected: boolean;
    provider?: string;
    loading: boolean;
  }>({
    connected: false,
    loading: true,
  });

  const quickActionChips = [
    { label: '3D Make', icon: Box },
    { label: 'Slides', icon: FileCode },
    { label: 'Deep Research', icon: Search },
    { label: 'Build', icon: Hammer },
  ];

  const examplePrompts = [
    'Build an AI productivity SaaS landing page with dark mode, interactive pricing cards, and testimonials',
    'Generate an ultra-sleek personal portfolio for a Senior Full Stack Engineer with project grid and contact modal',
    'Create a modern crypto & web3 portfolio tracker dashboard with analytics chart mockups',
  ];

  useEffect(() => {
    async function verifyConnection() {
      try {
        const health = await checkBackendHealth();
        setBackendHealth({
          connected: health.status === 'ok' || health.status === 'degraded',
          provider: health.activeProvider,
          loading: false,
        });
      } catch (err) {
        setBackendHealth({
          connected: false,
          loading: false,
        });
      }
    }
    verifyConnection();
  }, []);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);
    console.log('[Frontend] Submitting prompt:', prompt);

    try {
      const response = await generateProject(prompt);
      console.log('[Frontend] Generation response:', response);
      if (response.success && response.data) {
        setGeneratedProject(response.data);
      } else {
        setError(response.error || 'Failed to generate code.');
      }
    } catch (err: any) {
      console.error('[Frontend] Error calling API:', err);
      setError(err.message || 'Error communicating with backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = () => {
    const file = generatedProject?.files?.[0];
    if (file) {
      navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentFile = generatedProject?.files?.[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0d0f11] text-[#e6e8eb]">
      {/* Left Collapsible Kimi Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeNav={activeNav}
        onSelectNav={setActiveNav}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Minimal Bar */}
        <header className="h-12 border-b border-[#1b1f24] px-5 flex items-center justify-between shrink-0 bg-[#0d0f11]">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#787f87] font-medium">Workspace</span>
            <span className="text-[#363d47]">/</span>
            <span className="text-xs text-white font-medium">New App</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#161a1f] border border-[#232932] text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendHealth.loading
                    ? 'bg-amber-400 animate-pulse'
                    : backendHealth.connected
                    ? 'bg-emerald-400'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-[#8e96a0]">
                {backendHealth.loading
                  ? 'Connecting...'
                  : backendHealth.connected
                  ? `Active: ${backendHealth.provider}`
                  : 'Backend Offline'}
              </span>
            </div>

            <button
              onClick={() => {
                setGeneratedProject(null);
                setPrompt('');
              }}
              className="px-2.5 py-1 rounded-lg hover:bg-[#1a1f26] text-[#787f87] hover:text-white text-xs transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>
        </header>

        {/* Dynamic Center Stage */}
        <main className="flex-1 overflow-y-auto flex flex-col items-center justify-between p-6">
          {activeNav === 'my-kimi' ? (
            <MyKimiView />
          ) : activeNav === 'plugins' ? (
            <PluginsView />
          ) : !generatedProject ? (
            /* Empty State: Pure Kimi Brand Center */
            <div className="w-full max-w-3xl flex-1 flex flex-col items-center justify-center my-auto">
              {/* Giant Kimi Typography */}
              <div className="mb-10 text-center select-none">
                <h1 className="text-6xl sm:text-7xl font-bold tracking-tight text-white font-sans">
                  KIMI
                </h1>
              </div>

              {/* Central Input Box */}
              <div className="w-full bg-[#16191d] border border-[#262c35] rounded-2xl p-3.5 shadow-2xl focus-within:border-[#3d4653] transition-all">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  placeholder="Ask anything, or describe an app to build..."
                  rows={3}
                  className="w-full bg-transparent text-sm text-white placeholder-[#68707a] resize-none outline-none px-2 pt-1 font-normal"
                />

                {/* Bottom row inside input box */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1e2329] mt-2 px-1">
                  {/* Left attachments / options */}
                  <div className="flex items-center gap-1 text-[#878e96]">
                    <button
                      type="button"
                      className="p-1.5 hover:bg-[#20252c] hover:text-white rounded-lg transition"
                      title="Attach file"
                    >
                      <Plus className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#20252c] hover:text-white rounded-lg text-xs transition"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Choose project</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-2.5 py-1 hover:bg-[#20252c] hover:text-white rounded-lg text-xs transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Plugins</span>
                    </button>
                  </div>

                  {/* Right Model Selection & Send Button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-[#1e232a] text-[#c7cbd1] px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer hover:bg-[#262c35] transition">
                      <span>{selectedModel}</span>
                      <span className="text-[#787f87] text-[11px] font-normal">{modelSpeed}</span>
                    </div>

                    <button
                      type="button"
                      className="p-1.5 text-[#878e96] hover:bg-[#20252c] hover:text-white rounded-lg transition"
                    >
                      <Mic className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleGenerate()}
                      disabled={loading || !prompt.trim()}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                        loading || !prompt.trim()
                          ? 'bg-[#262b33] text-[#555d66] cursor-not-allowed'
                          : 'bg-white text-black hover:bg-[#dedede]'
                      }`}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <ArrowUp className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="w-full mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center flex items-center justify-center gap-2">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Action Chips */}
              <div className="flex items-center gap-2.5 mt-5 flex-wrap justify-center">
                {quickActionChips.map((chip, idx) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => setPrompt(`Build with ${chip.label}: `)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#15181c] border border-[#21262d] hover:border-[#323943] text-[#8e96a0] hover:text-white text-xs transition"
                    >
                      <Icon className="w-3.5 h-3.5 text-[#6f7680]" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Example Prompts pills */}
              <div className="mt-8 flex flex-col gap-2 max-w-xl w-full">
                <span className="text-[11px] font-medium text-[#5c636d] uppercase tracking-wider text-center">
                  Try prompt ideas
                </span>
                <div className="flex flex-col gap-1.5">
                  {examplePrompts.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(ex)}
                      className="text-left text-xs text-[#878e96] hover:text-white bg-[#13161a] hover:bg-[#181c22] p-2.5 rounded-xl border border-[#1f242b] transition flex items-center justify-between group"
                    >
                      <span className="truncate mr-2">{ex}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#525963] group-hover:text-white shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Generated Project State: Split Screen Studio with Tabs */
            <div className="w-full flex-1 flex flex-col h-full bg-[#14171b] border border-[#21262d] rounded-2xl overflow-hidden shadow-2xl">
              {/* Studio Control Header */}
              <div className="h-12 border-b border-[#21262d] bg-[#111316] px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-white tracking-wide">
                    {generatedProject.title}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-[#1c2128] text-[#878e96] border border-[#282e37]">
                    {generatedProject.framework}
                  </span>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2">
                  <div className="flex bg-[#0b0d0f] p-0.5 rounded-lg border border-[#1f242b]">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                        activeTab === 'preview'
                          ? 'bg-[#1e232a] text-white shadow-sm'
                          : 'text-[#787f87] hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => setActiveTab('code')}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition ${
                        activeTab === 'code'
                          ? 'bg-[#1e232a] text-white shadow-sm'
                          : 'text-[#787f87] hover:text-white'
                      }`}
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      Code
                    </button>
                  </div>

                  {activeTab === 'code' && (
                    <button
                      onClick={handleCopyCode}
                      className="p-1.5 bg-[#1b2027] hover:bg-[#232932] text-[#878e96] hover:text-white rounded-lg text-xs transition flex items-center gap-1"
                      title="Copy code"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
              </div>

              {/* Viewport Content */}
              <div className="flex-1 bg-[#0b0d0f] p-4 flex flex-col overflow-hidden">
                {activeTab === 'preview' ? (
                  <div className="w-full flex-1 rounded-xl overflow-hidden border border-[#21262d] bg-white relative">
                    <iframe
                      title="Generated Website"
                      sandbox="allow-scripts"
                      srcDoc={currentFile?.content || ''}
                      className="w-full h-full border-0"
                    />
                  </div>
                ) : (
                  <div className="w-full flex-1 rounded-xl border border-[#21262d] bg-[#111317] p-4 font-mono text-xs text-[#d1d5db] overflow-auto">
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#21262d] text-[#6e7681]">
                      <span>File: {currentFile?.path}</span>
                      <span>Lang: {currentFile?.language}</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{currentFile?.content}</pre>
                  </div>
                )}
              </div>

              {/* Bottom Quick-Chat prompt for iteration */}
              <div className="p-3 border-t border-[#21262d] bg-[#111316]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Refine or iterate on this generated website..."
                    className="flex-1 bg-[#161a20] border border-[#242b34] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#68707a] outline-none focus:border-[#3d4756] transition"
                  />
                  <button
                    onClick={() => handleGenerate()}
                    disabled={loading || !prompt.trim()}
                    className="px-4 py-2 bg-white text-black hover:bg-[#dedede] font-semibold text-xs rounded-xl flex items-center gap-1.5 transition disabled:opacity-40"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="py-2 text-[11px] text-[#555c66] flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#555c66]" />
            <span>Kimi Platform Aesthetic &bull; Phase 1 Multi-Provider Ready</span>
          </div>
        </main>
      </div>
    </div>
  );
}
