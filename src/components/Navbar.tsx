'use client';

import { LayoutDashboard, Video, FolderOpen } from 'lucide-react';

export type TabType = 'dashboard' | 'realtime' | 'library';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: { id: TabType; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'realtime', label: 'Real-Time', icon: Video },
  { id: 'library', label: 'Library', icon: FolderOpen },
];

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50">
      <div className="max-w-[1920px] mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">MW</span>
            </div>
            <span className="text-lg font-semibold text-white">MediWatch</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-slate-400">System Active</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
