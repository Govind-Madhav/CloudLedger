import React from 'react';
import { Cloud, LogOut } from 'lucide-react';
import type { AdminUser } from '../api';

interface NavbarProps {
  admin: AdminUser;
  onLogout: () => void;
  isDemoMode?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ admin, onLogout, isDemoMode = true }) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Cloud className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white tracking-tight text-base">CloudLedger</span>
          <span className="text-[10px] text-slate-500 block font-mono">AWS Student Cost & Usage Monitor</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Environment Badge */}
        {isDemoMode ? (
          <div className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center space-x-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Mock Simulation</span>
          </div>
        ) : (
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Live AWS Mode</span>
          </div>
        )}

        {/* Admin Profile */}
        <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-white block">{admin.full_name}</span>
            <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-mono">{admin.role}</span>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
