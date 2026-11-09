'use client';

import {
  AppWindow,
  BookOpen,
  Box,
  ChevronRight,
  Clock,
  Compass,
  FileSpreadsheet,
  FileText,
  Hammer,
  HelpCircle,
  LayoutGrid,
  Lightbulb,
  LogOut,
  Mic,
  Monitor,
  Paintbrush,
  Paperclip,
  Plus,
  Search,
  Settings,
  Sparkles,
  User
} from 'lucide-react';
import React from 'react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeNav: string;
  onSelectNav: (id: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  activeNav,
  onSelectNav,
}) => {
  const topNavItems = [
    { id: 'chat', label: 'New chat', icon: Plus, badge: 'Ctrl K', isAction: true },
    { id: 'my-kimi', label: 'My Kimi', icon: User },
    { id: 'plugins', label: 'Plugins', icon: LayoutGrid },
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
    { id: 'inspiration', label: 'Inspiration', icon: Lightbulb },
    { id: 'slides', label: 'Slides', icon: FileText },
    { id: '3d-make', label: '3D Make', icon: Box, tag: 'New' },
  ];

  const bottomCategoryItems = [
    { id: 'deep-research', label: 'Deep Research', icon: Search },
    { id: 'build', label: 'Build', icon: Hammer },
    { id: 'docs', label: 'Docs', icon: FileText },
    { id: 'sheets', label: 'Sheets', icon: FileSpreadsheet },
    { id: 'design', label: 'Design', icon: Paintbrush, tag: 'Beta' },
  ];

  return (
    <aside
      className={`h-screen bg-[#111315] text-[#9a9fa5] flex flex-col justify-between border-r border-[#1e2227] select-none transition-all duration-200 z-40 ${collapsed ? 'w-[68px]' : 'w-[250px]'
        }`}
    >
      {/* Top Header / Logo */}
      <div className="flex flex-col">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-white text-black font-extrabold flex items-center justify-center text-sm shadow-sm">
              K<span className="text-blue-500 font-black">.</span>
            </div>
            {!collapsed && (
              <span className="font-semibold text-white tracking-wide text-base">
                KIMI
              </span>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 hover:bg-[#1f2429] hover:text-white rounded-md text-[#787f87] transition"
          >
            <AppWindow className="w-4 h-4" />
          </button>
        </div>

        {/* Top Nav List */}
        <div className="px-3 py-2 space-y-1">
          {topNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${item.isAction
                    ? 'bg-[#1e2227] text-white hover:bg-[#282d34]'
                    : isActive
                      ? 'bg-[#1b2026] text-white'
                      : 'hover:bg-[#191d22] hover:text-[#e6e8eb]'
                  }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${item.isAction ? 'text-white' : 'text-[#878e96]'}`} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && (
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="text-[10px] font-mono bg-[#111315] text-[#697078] px-1.5 py-0.5 rounded border border-[#23272d]">
                        {item.badge}
                      </span>
                    )}
                    {item.tag && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 font-semibold">
                        {item.tag}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Separator / Tools */}
        <div className="my-2 border-t border-[#1c2025] mx-4" />

        <div className="px-3 space-y-0.5">
          {bottomCategoryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${isActive
                    ? 'bg-[#1b2026] text-white'
                    : 'hover:bg-[#191d22] hover:text-[#e6e8eb]'
                  }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0 text-[#878e96]" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && item.tag && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 font-semibold">
                    {item.tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Profile & Invite */}
      <div className="p-3 border-t border-[#1e2227] space-y-2">
        {!collapsed && (
          <div className="p-2.5 rounded-xl bg-gradient-to-r from-[#181d24] to-[#1e242d] border border-[#262c36] flex items-center justify-between cursor-pointer hover:border-[#38414e] transition">
            <div className="text-[11px]">
              <div className="font-semibold text-white flex items-center gap-1">
                <span>Invite to Earn</span>
              </div>
              <p className="text-[#848d97] text-[10px]">Get K3.1 Pro Benefits</p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#848d97]" />
          </div>
        )}

        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[#191d22] cursor-pointer text-xs">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-7 h-7 rounded-full bg-[#8257e5] text-white font-bold flex items-center justify-center text-xs shrink-0">
              L
            </div>
            {!collapsed && (
              <span className="truncate text-white font-medium text-xs">
                logan AI Studio
              </span>
            )}
          </div>
          {!collapsed && <LogOut className="w-3.5 h-3.5 text-[#6f7680] hover:text-white" />}
        </div>
      </div>
    </aside>
  );
};

