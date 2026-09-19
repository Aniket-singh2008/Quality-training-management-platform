import React from 'react';
import { PROFILE_AVATAR_URL } from '../data/initialData';
import { Agent } from '../types';
import { SupabaseHealthStatus } from '../services/supabaseService';

interface HeaderProps {
  currentTab: string;
  title?: string;
  onBack?: () => void;
  onOpenNotifications: () => void;
  unreadCount: number;
  onOpenProfile: () => void;
  onOpenSidebar: () => void;
  userRole: 'admin' | 'agent';
  onToggleRole: () => void;
  onSearchClick?: () => void;
  agents?: Agent[];
  currentAgentId?: string;
  onSelectCurrentAgent?: (agentId: string) => void;
  supabaseStatus?: SupabaseHealthStatus | null;
  onOpenSupabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  title,
  onBack,
  onOpenNotifications,
  unreadCount,
  onOpenProfile,
  onOpenSidebar,
  userRole,
  onToggleRole,
  onSearchClick,
  agents = [],
  currentAgentId,
  onSelectCurrentAgent,
  supabaseStatus,
  onOpenSupabaseModal
}) => {
  const currentAgent = agents.find((a) => a.id === currentAgentId) || agents[0];

  const getTabLabel = () => {
    if (title) return title;
    switch (currentTab) {
      case 'dashboard':
        return userRole === 'admin' ? 'Operations Overview' : 'My Agent Portal';
      case 'updates':
        return userRole === 'admin' ? 'Process Updates & SOPs' : 'SOPs & Training';
      case 'agents':
        return 'Agent Management & Scoring';
      case 'submissions':
        return userRole === 'admin' ? 'Audit Submissions' : 'My Scorecards';
      case 'leaderboard':
        return 'Leaderboard & Rankings';
      case 'process-detail':
        return 'SOP & Certification Quiz';
      case 'analytics':
        return 'Quality Calibration';
      case 'settings':
        return 'Platform Settings';
      case 'new-audit':
        return 'Create Process Audit';
      default:
        return 'ProcessHub';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Left: Hamburger (mobile) + Breadcrumbs / Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Dashboard</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>ProcessHub</span>
            <span>/</span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
            {getTabLabel()}
          </h2>
        </div>
      </div>

      {/* Center / Right: Quick Actions, Role Toggle & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search trigger */}
        <div
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 text-slate-400 text-xs font-medium cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-all border border-slate-200/50 w-48 lg:w-60"
        >
          <span className="material-symbols-outlined text-[16px]">search</span>
          <span className="flex-1 truncate">Search SOPs, quizzes, agents...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] font-semibold text-slate-400 shadow-2xs border border-slate-200">
            ⌘K
          </kbd>
        </div>

        {/* Supabase Connection Status Pill */}
        {onOpenSupabaseModal && (
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              supabaseStatus?.tablesExist
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Supabase Database Status & Setup"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                supabaseStatus?.tablesExist
                  ? 'bg-emerald-500 animate-pulse'
                  : 'bg-amber-500'
              }`}
            />
            <span className="hidden md:inline">Supabase</span>
            <span className="text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-white/70">
              {supabaseStatus?.tablesExist ? 'Live' : 'Setup'}
            </span>
          </button>
        )}

        {/* If in Agent Mode: Agent Switcher Dropdown to test agent privacy */}
        {userRole === 'agent' && agents.length > 0 && onSelectCurrentAgent && (
          <div className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-purple-700 font-bold hidden xl:inline">Logged in as:</span>
            <select
              value={currentAgentId}
              onChange={(e) => onSelectCurrentAgent(e.target.value)}
              className="bg-transparent font-bold text-purple-900 outline-none cursor-pointer text-xs"
            >
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.team})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Role Toggle Pill in Header for fast testing */}
        <div className="hidden sm:flex items-center p-0.5 rounded-full bg-slate-100 border border-slate-200/80">
          <button
            onClick={() => {
              if (userRole !== 'admin') onToggleRole();
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              userRole === 'admin'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => {
              if (userRole !== 'agent') onToggleRole();
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              userRole === 'agent'
                ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Agent
          </button>
        </div>

        {/* Notification Bell with Badge */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          title="Notifications"
        >
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>

        {/* User Profile Avatar */}
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 p-1 pl-1.5 rounded-full hover:bg-slate-100 transition-all cursor-pointer border border-transparent hover:border-slate-200"
        >
          {userRole === 'admin' ? (
            <img
              src={PROFILE_AVATAR_URL}
              alt="User"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20"
            />
          ) : (
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
                currentAgent?.colorClass || 'bg-purple-600 text-white'
              }`}
            >
              {currentAgent?.initial || 'A'}
            </div>
          )}
          <div className="hidden lg:block text-left pr-1">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              {userRole === 'admin' ? 'Jyoti' : currentAgent?.name?.split(' ')[0] || 'Agent'}
            </p>
            <p className="text-[10px] text-indigo-600 font-semibold leading-tight">
              {userRole === 'admin' ? 'QA Admin' : 'Agent'}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
};
