'use client';

import { Sparkles } from 'lucide-react';
import React, { useState } from 'react';

export const MyKimiView: React.FC = () => {
  const [selfGrowth, setSelfGrowth] = useState(false);

  // Generate a 12-month activity grid like Kimi's streak view
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const columns = 48; // roughly 4 weeks per month * 12
  const rows = 7;     // days of week

  return (
    <div className="w-full max-w-4xl mx-auto py-10 px-6 flex flex-col space-y-12">
      {/* Top Banner & Header */}
      <div className="space-y-4">
        {/* Blue Orb Icon */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 via-sky-400 to-cyan-300 shadow-lg shadow-sky-500/20 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-white/40 blur-[1px]" />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              loganayaki B SNSIHUB&apos;s Kimi
            </h2>
            <p className="text-xs text-[#8c949e] mt-1">
              Kimi has been with you for <span className="text-white font-medium">2 days</span> across{' '}
              <span className="text-white font-medium">0 chats</span>, and we&apos;ve chatted{' '}
              <span className="text-white font-medium">0 days in a row</span>
            </p>
          </div>

          <button
            onClick={() => setSelfGrowth(!selfGrowth)}
            className="px-4 py-2 rounded-full bg-[#f1f3f5] text-[#121417] hover:bg-white text-xs font-semibold transition self-start sm:self-auto shadow-sm"
          >
            {selfGrowth ? 'Self-growth Enabled' : 'Enable self-growth'}
          </button>
        </div>
      </div>

      {/* Activity Heatmap Grid */}
      <div className="p-5 rounded-2xl bg-[#14171a] border border-[#21262d] flex flex-col space-y-3">
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
            {Array.from({ length: columns * rows }).map((_, i) => {
              // Highlight a few recent dots
              const isRecent = i > columns * rows - 10 && i % 3 === 0;
              return (
                <div
                  key={i}
                  className={`w-2.5 h-2.5 rounded-[2px] transition ${isRecent ? 'bg-sky-400/80 shadow-[0_0_6px_rgba(56,189,248,0.5)]' : 'bg-[#222830]'
                    }`}
                />
              );
            })}
          </div>
        </div>

        {/* Months labels */}
        <div className="flex justify-between text-[11px] text-[#636c76] px-1 select-none">
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>

      {/* Feature Section: Self-growth & Pixel Avatar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Kimi can now learn and grow on its own
          </h3>
          <p className="text-xs text-[#8c949e] leading-relaxed">
            Once enabled, Kimi keeps learning your preferences, habits, and ways of working, making
            every collaboration the start of the next one.
          </p>

          <button
            onClick={() => setSelfGrowth(!selfGrowth)}
            className="px-5 py-2.5 rounded-full bg-[#20252c] text-white hover:bg-[#2b323c] border border-[#323945] text-xs font-medium transition shadow-sm"
          >
            {selfGrowth ? 'Manage Preferences' : 'Enable self-growth'}
          </button>
        </div>

        {/* Pixel Dot-Matrix Mascot Representation matching screenshot */}
        <div className="flex items-center justify-center">
          <div className="w-56 h-56 rounded-full bg-radial-gradient flex items-center justify-center p-6 bg-[#121519] border border-[#1f252d] shadow-inner">
            <div className="grid grid-cols-9 gap-1.5 p-2">
              {Array.from({ length: 81 }).map((_, idx) => {
                // Shape matrix to resemble the blue/white pixel ghost mascot
                const isWhiteEye = idx === 20 || idx === 24;
                const isCyan = [
                  11, 12, 13, 14, 15,
                  19, 21, 22, 23, 25,
                  28, 29, 30, 31, 32, 33, 34,
                  37, 38, 39, 40, 41, 42, 43,
                  46, 47, 48, 49, 50, 51, 52,
                  55, 57, 59, 61
                ].includes(idx);

                return (
                  <div
                    key={idx}
                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${isWhiteEye
                        ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                        : isCyan
                          ? 'bg-gradient-to-tr from-sky-500 to-blue-500 shadow-[0_0_4px_rgba(14,165,233,0.4)]'
                          : 'bg-[#1b2027]/40'
                      }`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

