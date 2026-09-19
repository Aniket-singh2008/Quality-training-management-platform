import React from 'react';

export const AnalyticsView: React.FC = () => {
  const squads = [
    { name: 'Customer Success', score: 94, passedCount: 6, total: 6, status: 'Leading', color: 'bg-emerald-500' },
    { name: 'Escalations Squad', score: 88, passedCount: 7, total: 8, status: 'On Track', color: 'bg-indigo-600' },
    { name: 'Billing Ops', score: 85, passedCount: 4, total: 5, status: 'Target Met', color: 'bg-blue-600' },
    { name: 'Tier 1 Support', score: 82, passedCount: 4, total: 5, status: 'Calibrating', color: 'bg-purple-600' }
  ];

  return (
    <div className="flex flex-col w-full gap-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Quality Calibration &amp; Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              Q4 Cycle
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Enterprise quality metrics, department calibrations, and knowledge retention benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
            Weekly Sync • Oct 2024
          </span>
        </div>
      </div>

      {/* 4 Colorful Gradient Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/15">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
            Calibration Rate
          </span>
          <p className="text-3xl font-extrabold mt-1">98.4%</p>
          <span className="text-xs font-semibold text-blue-200 mt-1 flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            +1.2% this cycle
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-500/15">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            Avg Quiz Score
          </span>
          <p className="text-3xl font-extrabold mt-1">87.2%</p>
          <span className="text-xs font-semibold text-emerald-200 mt-1 block">
            Target benchmark: 85.0%
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-800 text-white shadow-md shadow-purple-500/15">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-100">
            SLA Adherence
          </span>
          <p className="text-3xl font-extrabold mt-1">99.1%</p>
          <span className="text-xs font-semibold text-purple-200 mt-1 block">
            Sev-1 15-min compliant
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-600 text-white shadow-md shadow-orange-500/15">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-100">
            Audits Completed
          </span>
          <p className="text-3xl font-extrabold mt-1">142</p>
          <span className="text-xs font-semibold text-amber-200 mt-1 block">
            Across 8 operational SOPs
          </span>
        </div>
      </div>

      {/* Squad Leaderboard Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Squad Performance Breakdown</h2>
            <p className="text-xs text-slate-500">Averaged across all Q4 audit certifications</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
            4 Squads Active
          </span>
        </div>

        <div className="space-y-4">
          {squads.map((sq, i) => (
            <div
              key={sq.name}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 hover:bg-indigo-50/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-900">{sq.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold text-slate-900">{sq.score}%</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sq.score >= 90
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {sq.status}
                  </span>
                </div>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${sq.color}`}
                  style={{ width: `${sq.score}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                <span>{sq.passedCount} of {sq.total} agents certified</span>
                <span>Minimum Passing Threshold: 85%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retention Insights Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Knowledge Retention Hotspots</h2>
        <p className="text-xs text-slate-500 mb-4">
          High-risk quiz questions identified for manager coaching and refresher modules
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-start gap-3">
            <span className="material-symbols-outlined text-rose-600 text-[24px] flex-shrink-0 mt-0.5">
              warning
            </span>
            <div className="text-xs text-slate-700 flex-1">
              <span className="font-bold text-rose-900 text-sm block">
                Escalation Matrix Triage (38% miss rate)
              </span>
              <p className="text-rose-800/90 mt-1 leading-relaxed">
                Agents frequently confuse Sev-1 SLA (15 min) with Sev-2 response time (30 min).
                Scheduled automated reminder notifications for next week.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-[24px] flex-shrink-0 mt-0.5">
              check_circle
            </span>
            <div className="text-xs text-slate-700 flex-1">
              <span className="font-bold text-emerald-900 text-sm block">
                PII Redaction Protocol (100% pass)
              </span>
              <p className="text-emerald-800/90 mt-1 leading-relaxed">
                Full compliance achieved across all 4 operational squads on GDPR masking rules prior
                to third-party vendor transfers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
