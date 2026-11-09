'use client';

import {
  Briefcase,
  ChevronDown,
  Code,
  FileCheck,
  GraduationCap,
  LineChart,
  Megaphone,
  Palette,
  Plus,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import React, { useState } from 'react';

interface PluginSkill {
  id: string;
  name: string;
  author: string;
  users: string;
  category: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

export const PluginsView: React.FC = () => {
  const [topTab, setTopTab] = useState<'plugins' | 'skills'>('skills');
  const [activeCategory, setActiveCategory] = useState('Finance');
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());

  const categories = [
    'Added',
    'Featured',
    'Productivity',
    'Finance',
    'Academic',
    'Marketing',
    'Engineering',
    'Creative',
  ];

  const skillsData: PluginSkill[] = [
    {
      id: 'saas-metrics-coach',
      name: 'saas-metrics-coach',
      author: 'Abbas Mir',
      users: '34.93K users',
      category: 'Finance',
      description: 'Calculate ARR, churn, LTV, CAC, and NRR from your SaaS data, benchmark against industry standards, and get strategic advice.',
      iconBg: 'bg-blue-600/20',
      iconColor: 'text-blue-400',
    },
    {
      id: 'legal-risk-assessment',
      name: 'legal-risk-assessment',
      author: 'Kimi',
      users: '17.9K users',
      category: 'Finance',
      description: 'Score and classify legal risks with a severity by likelihood matrix, including escalation guidance for each risk level.',
      iconBg: 'bg-amber-600/20',
      iconColor: 'text-amber-400',
    },
    {
      id: 'value-investing-scorecard',
      name: 'value-investing-scorecard',
      author: 'Kimi',
      users: '26.38K users',
      category: 'Finance',
      description: 'Score any company on 20 Buffett/Graham criteria across moat, management, financials, and valuation for a 0-100 score.',
      iconBg: 'bg-emerald-600/20',
      iconColor: 'text-emerald-400',
    },
    {
      id: 'tos-clause-scanner',
      name: 'tos-clause-scanner',
      author: 'Kimi',
      users: '49.19K users',
      category: 'Finance',
      description: 'Audit Terms of Service and privacy policies from a consumer perspective, flagging unfair clauses, data traps, and risks.',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
    {
      id: 'stock-signal-analyzer',
      name: 'stock-signal-analyzer',
      author: 'Kimi',
      users: '21.56K users',
      category: 'Finance',
      description: 'Compute 15+ technical indicators from OHLCV data and generate a bullish/bearish signal summary with an overall health score.',
      iconBg: 'bg-teal-600/20',
      iconColor: 'text-teal-400',
    },
    {
      id: 'regulatory-audit-generator',
      name: 'regulatory-audit-generator',
      author: 'Kimi',
      users: '29.78K users',
      category: 'Finance',
      description: 'Build structured compliance checklists for GDPR, PIPL, and data laws with risk levels and actionable remediation steps.',
      iconBg: 'bg-indigo-600/20',
      iconColor: 'text-indigo-400',
    },
  ];

  const toggleAdd = (id: string) => {
    setAddedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 px-6 flex flex-col space-y-8 select-none">
      {/* Top Header: Plugins / Skills tab */}
      <div className="flex items-center justify-between border-b border-[#1c2127] pb-3">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setTopTab('plugins')}
            className={`text-sm font-semibold transition pb-2 relative ${
              topTab === 'plugins' ? 'text-white' : 'text-[#7d8692] hover:text-[#c4cbd4]'
            }`}
          >
            Plugins
            {topTab === 'plugins' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-white rounded-full" />
            )}
          </button>
          <button
            onClick={() => setTopTab('skills')}
            className={`text-sm font-semibold transition pb-2 relative ${
              topTab === 'skills' ? 'text-white' : 'text-[#7d8692] hover:text-[#c4cbd4]'
            }`}
          >
            Skills
            {topTab === 'skills' && (
              <span className="absolute bottom-[-13px] left-0 right-0 h-[2px] bg-white rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Skills</h2>
          <p className="text-xs text-[#8a939e] mt-1">
            Turn know-how into skills. Reuse them anytime
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Button Icon */}
          <button className="p-2 rounded-lg hover:bg-[#1a1f26] text-[#7d8692] hover:text-white transition">
            <Search className="w-4 h-4" />
          </button>

          {/* Customize Dropdown Pill */}
          <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1b2027] hover:bg-[#232932] text-xs font-semibold text-white border border-[#2b323c] transition shadow-sm">
            <span>Customize</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8a939e]" />
          </button>
        </div>
      </div>

      {/* Filter Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-[#222830] text-white shadow-sm border border-[#313a46]'
                  : 'text-[#87909c] hover:text-white hover:bg-[#171b21]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Category Section Header */}
      <div className="pt-2">
        <span className="text-xs text-[#717983] font-medium">{activeCategory}</span>
      </div>

      {/* Skills 2-Column Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
        {skillsData.map((skill) => {
          const isAdded = addedSkills.has(skill.id);
          return (
            <div
              key={skill.id}
              className="p-4 rounded-2xl bg-[#14171a] border border-[#20252c] hover:border-[#2f3742] transition flex flex-col justify-between space-y-3 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${skill.iconBg} ${skill.iconColor} flex items-center justify-center shrink-0 shadow-inner`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white group-hover:text-blue-400 transition">
                      {skill.name}
                    </h4>
                    <p className="text-[11px] text-[#78818c]">
                      From {skill.author} &bull; {skill.users}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleAdd(skill.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition shrink-0 ${
                    isAdded
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                      : 'bg-[#1e232a] text-[#c2c8d0] hover:bg-[#282f38] hover:text-white border border-[#2b323c]'
                  }`}
                >
                  {isAdded ? 'Added' : 'Add'}
                </button>
              </div>

              <p className="text-xs text-[#8c949f] leading-relaxed line-clamp-2">
                {skill.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
