'use client';

import { Sparkles, Terminal } from 'lucide-react';
import React from 'react';

interface NavbarProps {
  backendStatus: {
    connected: boolean;
    provider?: string;
    loading: boolean;
  };
}

export const Navbar: React.FC<NavbarProps> = ({ backendStatus }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-lg text-white tracking-tight">AI Web Studio</span>
            <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Phase 1 Preview
            </span>
          </div>
        </div>

        {/* Backend Connectivity Status Pill */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60">
            <span
              className={`w-2 h-2 rounded-full ${backendStatus.loading
                  ? 'bg-amber-400 animate-pulse'
                  : backendStatus.connected
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                    : 'bg-rose-500'
                }`}
            />
            <span className="text-slate-300">
              {backendStatus.loading
                ? 'Connecting to backend...'
                : backendStatus.connected
                  ? `Backend: Online (${backendStatus.provider})`
                  : 'Backend: Disconnected'}
            </span>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-slate-400 hover:text-slate-200 transition p-2"
          >
            <Terminal className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
};

