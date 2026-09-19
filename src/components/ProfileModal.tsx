import React from 'react';
import { PROFILE_AVATAR_URL } from '../data/initialData';

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/30 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-xl border border-outline-variant/30 p-5 flex flex-col items-center text-center">
        <div className="relative mb-3">
          <img
            src={PROFILE_AVATAR_URL}
            alt="Jyoti"
            className="w-20 h-20 rounded-full object-cover ring-4 ring-primary-fixed shadow-md"
          />
          <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-tertiary ring-2 ring-white" />
        </div>

        <h3 className="font-title-lg text-title-lg font-bold text-on-surface">Jyoti</h3>
        <p className="text-xs text-secondary font-medium">Head of Quality &amp; Agent Enablement</p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary text-xs font-semibold">
            QA Lead
          </span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary text-xs font-semibold">
            Q4 Audit Cycle
          </span>
        </div>

        <div className="w-full bg-surface-container-low rounded-xl p-3 mt-4 text-left space-y-2 text-xs border border-outline-variant/20">
          <div className="flex items-center justify-between">
            <span className="text-secondary">Email</span>
            <span className="font-semibold text-on-surface">jyoti.lead@processhub.internal</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Assigned Squads</span>
            <span className="font-semibold text-on-surface">4 Teams (24 Agents)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-secondary">Audit Permissions</span>
            <span className="font-semibold text-tertiary">Full Admin &amp; Publish</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors cursor-pointer shadow-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
};
