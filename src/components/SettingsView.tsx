import React, { useState } from 'react';
import { SystemSettings } from '../types';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (settings: SystemSettings) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSaveSettings }) => {
  const [current, setCurrent] = useState<SystemSettings>(settings);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(current);
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Platform Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure QA passing thresholds, incident SLA rules, and automated notification schedules.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: QA Calibration & Rubrics */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">tune</span>
              Quality Assurance Benchmarks
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Establish minimum score cutoffs required for agent certification.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Quiz Passing Score Cutoff</span>
              <span className="text-indigo-600 font-extrabold text-sm">
                {current.passThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="60"
              max="95"
              step="5"
              value={current.passThreshold}
              onChange={(e) =>
                setCurrent({ ...current, passThreshold: parseInt(e.target.value) })
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>60% (Lenient)</span>
              <span>80% (Recommended Default)</span>
              <span>95% (Strict SLA)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Severity-1 Incident SLA (Minutes)
              </label>
              <input
                type="number"
                value={current.sev1SlaMinutes}
                onChange={(e) =>
                  setCurrent({ ...current, sev1SlaMinutes: parseInt(e.target.value) || 15 })
                }
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                value={current.orgName}
                onChange={(e) => setCurrent({ ...current, orgName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Automated Workflows & Notifications */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">notifications_active</span>
              Automation &amp; Dispatch Rules
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Control when agents receive automated email and platform nudges.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">Auto-Assign New Hires</p>
                <p className="text-[11px] text-slate-500">
                  Automatically enroll new agents into foundational SOPs
                </p>
              </div>
              <input
                type="checkbox"
                checked={current.autoAssignNewHires}
                onChange={(e) =>
                  setCurrent({ ...current, autoAssignNewHires: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">Daily Quiz Reminders</p>
                <p className="text-[11px] text-slate-500">
                  Dispatch reminder pings 24 hours prior to SLA timeout
                </p>
              </div>
              <input
                type="checkbox"
                checked={current.dailyQuizReminders}
                onChange={(e) =>
                  setCurrent({ ...current, dailyQuizReminders: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/70 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-800">Email Alerts to QA Leads</p>
                <p className="text-[11px] text-slate-500">
                  Send immediate notifications when an agent misses two consecutive quiz attempts
                </p>
              </div>
              <input
                type="checkbox"
                checked={current.emailAlerts}
                onChange={(e) => setCurrent({ ...current, emailAlerts: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Brand Theme Accent */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-[20px]">palette</span>
              Design Palette Accent
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select primary highlight accents for cards and buttons.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'indigo', label: 'Indigo & Royal Blue', color: 'from-blue-600 to-indigo-700' },
              { id: 'violet', label: 'Electric Violet', color: 'from-violet-600 to-purple-700' },
              { id: 'cyan', label: 'Ocean Cyan', color: 'from-cyan-500 to-blue-600' }
            ].map((theme) => (
              <button
                key={theme.id}
                type="button"
                onClick={() =>
                  setCurrent({ ...current, accentTheme: theme.id as 'indigo' | 'violet' | 'cyan' })
                }
                className={`p-3 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                  current.accentTheme === theme.id
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${theme.color}`} />
                <span className="text-xs font-bold text-slate-800">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};
