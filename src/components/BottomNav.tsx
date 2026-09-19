import React from 'react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)] border-t border-outline-variant/20">
      <div className="flex items-center justify-around h-16 px-space-xs max-w-md mx-auto">
        {/* Dashboard Tab */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors cursor-pointer ${
            currentTab === 'dashboard'
              ? 'text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">grid_view</span>
          <span className="font-label-sm text-[11px] mt-0.5">Dashboard</span>
        </button>

        {/* Updates Tab */}
        <button
          onClick={() => onTabChange('updates')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors cursor-pointer ${
            currentTab === 'updates'
              ? 'text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">mark_chat_unread</span>
          <span className="font-label-sm text-[11px] mt-0.5">Updates</span>
        </button>

        {/* Center Primary Action (+) */}
        <button
          onClick={() => onTabChange('new-audit')}
          className="flex items-center justify-center min-w-[48px] h-12 cursor-pointer active:scale-95 transition-transform"
          aria-label="Create New Audit"
        >
          <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary flex items-center justify-center shadow-md hover:bg-primary transition-colors">
            <span className="material-symbols-outlined text-[26px]">add</span>
          </div>
        </button>

        {/* Agents Tab */}
        <button
          onClick={() => onTabChange('agents')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors cursor-pointer ${
            currentTab === 'agents'
              ? 'text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">group</span>
          <span className="font-label-sm text-[11px] mt-0.5">Agents</span>
        </button>

        {/* Analytics Tab */}
        <button
          onClick={() => onTabChange('analytics')}
          className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors cursor-pointer ${
            currentTab === 'analytics'
              ? 'text-primary font-semibold'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">monitoring</span>
          <span className="font-label-sm text-[11px] mt-0.5">Analytics</span>
        </button>
      </div>
    </nav>
  );
};
