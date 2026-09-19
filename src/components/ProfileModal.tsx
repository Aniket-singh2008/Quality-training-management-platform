import React from 'react';
import { PROFILE_AVATAR_URL } from '../data/initialData';
import { UserProfile } from '../types';

interface ProfileModalProps {
  onClose: () => void;
  profile?: UserProfile | null;
  onSignOut?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, profile, onSignOut }) => {
  const isAdmin = profile?.role === 'admin';
  const displayName = profile?.fullName || (isAdmin ? 'Jyoti (Admin)' : 'Agent');
  const displayEmail = profile?.email || (isAdmin ? 'admin@processhub.internal' : 'agent@processhub.internal');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200/80 p-6 flex flex-col items-center text-center">
        <div className="relative mb-3">
          {isAdmin ? (
            <img
              src={PROFILE_AVATAR_URL}
              alt={displayName}
              className="w-20 h-20 rounded-full object-cover ring-4 ring-indigo-500/20 shadow-md"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-bold shadow-md ring-4 ring-purple-500/20">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white" />
        </div>

        <h3 className="text-lg font-bold text-slate-800">{displayName}</h3>
        <p className="text-xs text-slate-500 font-medium">
          {isAdmin ? 'Primary QA Lead & Administrator' : 'Quality Analyst / Process Agent'}
        </p>

        <div className="flex items-center gap-1.5 mt-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isAdmin
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                : 'bg-purple-50 text-purple-700 border border-purple-200/60'
            }`}
          >
            {isAdmin ? 'Primary Admin' : 'Authorized Agent'}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active
          </span>
        </div>

        <div className="w-full bg-slate-50 rounded-2xl p-3.5 mt-4 text-left space-y-2 text-xs border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Email</span>
            <span className="font-semibold text-slate-800 truncate max-w-[180px]">{displayEmail}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Auth Source</span>
            <span className="font-semibold text-slate-700">Supabase Auth</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Permissions</span>
            <span className={`font-semibold ${isAdmin ? 'text-indigo-600' : 'text-purple-600'}`}>
              {isAdmin ? 'Full Management & Publishing' : 'Agent Access & Quizzes'}
            </span>
          </div>
        </div>

        <div className="w-full flex items-center gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
          {onSignOut && (
            <button
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="flex-1 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
