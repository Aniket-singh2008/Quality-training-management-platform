import React from 'react';
import { LOGO_URL, PROFILE_AVATAR_URL } from '../data/initialData';
import { Agent } from '../types';

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  userRole: 'admin' | 'agent';
  onToggleRole: () => void;
  currentAgent?: Agent;
  unreadCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  isOpen,
  onCloseMobile,
  userRole,
  onToggleRole,
  currentAgent
}) => {
  const adminNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: 'updates', label: 'Process Updates', icon: 'layers', badge: '8' },
    { id: 'agents', label: 'Agent Management', icon: 'groups' },
    { id: 'submissions', label: 'Submissions', icon: 'assignment_turned_in', badge: 'New' },
    { id: 'leaderboard', label: 'Leaderboard', icon: 'leaderboard', highlight: true },
    { id: 'analytics', label: 'Analytics', icon: 'monitoring' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  const agentNavItems = [
    { id: 'dashboard', label: 'My Dashboard', icon: 'grid_view' },
    { id: 'updates', label: 'SOPs & Training', icon: 'layers', badge: '8' },
    { id: 'submissions', label: 'My Scorecards', icon: 'assignment_turned_in' },
    { id: 'leaderboard', label: 'Team Leaderboard', icon: 'leaderboard', highlight: true }
  ];

  const navItems = userRole === 'admin' ? adminNavItems : agentNavItems;

  const handleItemClick = (id: string) => {
    onTabChange(id);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white/90 backdrop-blur-xl border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={LOGO_URL}
                alt="ProcessHub Logo"
                className="h-9 w-9 rounded-xl object-contain shadow-sm ring-2 ring-indigo-500/20"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ProcessHub
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 text-[10px] font-bold text-blue-700 border border-blue-200/60 uppercase tracking-wider">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Operations &amp; QA Suite</p>
            </div>
          </div>

          {/* Close on mobile */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Role Switcher Pill */}
        <div className="px-4 pt-3 pb-1">
          <div className="p-1 rounded-xl bg-slate-100/90 border border-slate-200/60 flex items-center gap-1">
            <button
              onClick={() => {
                if (userRole !== 'admin') onToggleRole();
              }}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                userRole === 'admin'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">shield_person</span>
              Admin
            </button>
            <button
              onClick={() => {
                if (userRole !== 'agent') onToggleRole();
              }}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                userRole === 'agent'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">school</span>
              Agent View
            </button>
          </div>
        </div>

        {/* Main Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 no-scrollbar">
          <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {userRole === 'admin' ? 'Administration' : 'Agent Workspace'}
          </div>

          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badge === 'New'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Quick Create CTA in sidebar (Admin only) */}
          {userRole === 'admin' && (
            <div className="pt-3 px-1">
              <button
                onClick={() => handleItemClick('new-audit')}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Create Process</span>
              </button>
            </div>
          )}
        </div>

        {/* User Card at Bottom */}
        <div className="p-3.5 m-3 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/50 border border-slate-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {userRole === 'admin' ? (
              <div className="relative flex-shrink-0">
                <img
                  src={PROFILE_AVATAR_URL}
                  alt="Jyoti"
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-indigo-500/30 shadow-xs"
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
              </div>
            ) : (
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs ${
                  currentAgent?.colorClass || 'bg-purple-600 text-white'
                }`}
              >
                {currentAgent?.initial || 'A'}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-xs text-slate-800 truncate">
                {userRole === 'admin' ? 'Jyoti (QA Lead)' : currentAgent?.name || 'Agent'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {userRole === 'admin' ? 'Global Administrator' : currentAgent?.role || 'Agent'}
              </p>
            </div>
          </div>

          {userRole === 'admin' && (
            <button
              onClick={() => handleItemClick('settings')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
              title="Settings"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
