import React from 'react';
import { NotificationItem } from '../types';

interface NotificationsModalProps {
  notifications: NotificationItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onActionClick: (n: NotificationItem) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  notifications,
  onClose,
  onMarkAllRead,
  onActionClick
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pt-16 bg-on-surface/20 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl shadow-xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">notifications</span>
            <h3 className="font-semibold text-sm text-on-surface">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="p-2 overflow-y-auto space-y-1.5 no-scrollbar">
          {notifications.map((item) => (
            <div
              key={item.id}
              onClick={() => onActionClick(item)}
              className={`p-3 rounded-xl border transition-all cursor-pointer ${
                item.read
                  ? 'bg-surface-container-lowest border-outline-variant/10 hover:bg-surface-container-low'
                  : 'bg-surface-container-low/70 border-primary/20 hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {!item.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  <h4 className="text-xs font-semibold text-on-surface">{item.title}</h4>
                </div>
                <span className="text-[10px] text-secondary">{item.time}</span>
              </div>
              <p className="text-xs text-secondary mt-1">{item.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
