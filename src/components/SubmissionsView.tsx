import React, { useState } from 'react';
import { Submission, AuditProcess } from '../types';
import { HorizontalScorecard } from './HorizontalScorecard';

interface SubmissionsViewProps {
  submissions: Submission[];
  processes: AuditProcess[];
  userRole?: 'admin' | 'agent';
  currentAgentId?: string;
  onReviewSubmission: (process: AuditProcess) => void;
}

export const SubmissionsView: React.FC<SubmissionsViewProps> = ({
  submissions,
  processes,
  userRole = 'admin',
  currentAgentId,
  onReviewSubmission
}) => {
  const [filter, setFilter] = useState<'All' | 'Passed' | 'Review'>('All');
  const [search, setSearch] = useState('');
  const [selectedScorecard, setSelectedScorecard] = useState<Submission | null>(null);

  // PRIVACY ENFORCEMENT: If user is an agent, ONLY show their submissions!
  const visibleSubmissions =
    userRole === 'agent' && currentAgentId
      ? submissions.filter((s) => s.agentId === currentAgentId)
      : submissions;

  const filtered = visibleSubmissions.filter((sub) => {
    if (filter === 'Passed' && !sub.passed) return false;
    if (filter === 'Review' && sub.passed) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        sub.agentName.toLowerCase().includes(q) ||
        sub.processTitle.toLowerCase().includes(q) ||
        sub.team.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const passRate =
    visibleSubmissions.length > 0
      ? (
          (visibleSubmissions.filter((s) => s.passed).length / visibleSubmissions.length) *
          100
        ).toFixed(1)
      : '100';

  return (
    <div className="flex flex-col w-full gap-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {userRole === 'agent'
                ? 'My Submissions & Scorecards'
                : 'Audit Submissions & Scorecards'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              {visibleSubmissions.length} Recorded
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {userRole === 'agent'
              ? 'Your private graded certification records and official compliance scorecards.'
              : 'Real-time assessment results, graded question logs, and agent certification records.'}
          </p>
        </div>

        {/* Quick stat pill */}
        <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-2xl border border-slate-200/80 shadow-2xs text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Pass Rate</span>
            <span className="font-extrabold text-emerald-600">{passRate}%</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Passing Bar</span>
            <span className="font-extrabold text-indigo-600">80%</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder={
              userRole === 'agent'
                ? 'Search my submissions...'
                : 'Search by agent, process, or squad...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 text-xs sm:text-sm text-slate-800 outline-none border border-slate-200 focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="inline-flex bg-slate-100 p-1 rounded-xl">
          {(['All', 'Passed', 'Review'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === tab
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Submissions List / Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">Agent</th>
                <th className="py-3.5 px-6">Process Audit</th>
                <th className="py-3.5 px-6">Score &amp; Marks</th>
                <th className="py-3.5 px-6">Result</th>
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6 text-right">Scorecard</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filtered.map((sub) => {
                const targetProc =
                  processes.find((p) => p.id === sub.processId) || processes[0];
                return (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${sub.agentColor}`}
                        >
                          {sub.agentInitial}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{sub.agentName}</p>
                          <p className="text-[11px] text-slate-400">{sub.team}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-800">{sub.processTitle}</p>
                      <span className="text-[11px] text-indigo-600 font-medium">
                        {sub.answersSummary
                          ? `${sub.answersSummary.correct} of ${sub.answersSummary.total} correct`
                          : 'Full answers logged'}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-black text-sm text-slate-900">{sub.percentage}%</span>
                        <span className="text-xs text-slate-400">
                          ({sub.score}/{sub.totalMarks} pts)
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          sub.passed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {sub.passed ? 'Certified ✓' : 'Needs Review'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-slate-400 text-xs font-medium">
                      {sub.submittedAt}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedScorecard(sub)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[15px]">badge</span>
                          <span>Scorecard</span>
                        </button>

                        {userRole === 'admin' && (
                          <button
                            onClick={() => onReviewSubmission(targetProc)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            Review SOP
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                    No submissions found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Popup for Scorecard */}
      {selectedScorecard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl">
            <HorizontalScorecard
              submission={selectedScorecard}
              onClose={() => setSelectedScorecard(null)}
              showExpandDetails={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
