import React from 'react';
import { 
  LayoutDashboard, Users, Server, Activity, 
  DollarSign, Settings 
} from 'lucide-react';

export type NavTab = 'overview' | 'students' | 'resources' | 'activity' | 'costs' | 'system';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openAlertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab, 
  openAlertsCount = 0 
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'students' as NavTab, label: 'Students & IAM', icon: Users },
    { id: 'resources' as NavTab, label: 'AWS Resources', icon: Server },
    { id: 'activity' as NavTab, label: 'CloudTrail Audit', icon: Activity },
    { id: 'costs' as NavTab, label: 'Cost Allocation', icon: DollarSign },
    { id: 'system' as NavTab, label: 'System & Sync', icon: Settings, badge: openAlertsCount },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/60 p-4 flex flex-col justify-between shrink-0 hidden md:flex">
      <nav className="space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
          Cloud Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && item.badge > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Lab FinOps Footer */}
      <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 text-[11px] text-slate-400 space-y-1">
        <span className="font-semibold text-slate-300 block">Governance Rules</span>
        <p className="text-[10px] text-slate-500">
          • Auto-flag untagged resources<br />
          • Budget warning at 80%<br />
          • Real-time provenance matching
        </p>
      </div>
    </aside>
  );
};
