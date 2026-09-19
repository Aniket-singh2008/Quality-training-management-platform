import React, { useState } from 'react';
import { AuditProcess, Submission, Agent } from '../types';

interface QuizLeaderboardProps {
  processes: AuditProcess[];
  submissions: Submission[];
  agents: Agent[];
  currentAgentId?: string;
  isAdmin?: boolean;
}

export const QuizLeaderboard: React.FC<QuizLeaderboardProps> = ({
  processes,
  submissions,
  agents,
  currentAgentId,
  isAdmin = false
}) => {
  // Only published processes have public quiz rankings
  const publishedProcesses = processes.filter((p) => p.status === 'Published');

  // Currently selected process to view leaderboard for
  const [selectedProcessId, setSelectedProcessId] = useState<string>(
    publishedProcesses[0]?.id || ''
  );

  // If selected process is not in published, fallback to first
  const activeProcess =
    publishedProcesses.find((p) => p.id === selectedProcessId) || publishedProcesses[0];

  // Get all submissions for the selected process
  // Sort by percentage descending, then total score descending
  const processSubmissions = submissions
    .filter((s) => s.processId === activeProcess?.id)
    .sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      return b.score - a.score;
    });

  // Map submissions to rank rows while ensuring unique agent best score
  const agentBestSubmissions: Submission[] = [];
  const seenAgents = new Set<string>();

  for (const sub of processSubmissions) {
    if (!seenAgents.has(sub.agentId)) {
      seenAgents.add(sub.agentId);
      agentBestSubmissions.push(sub);
    }
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">quiz</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Quiz Leaderboard</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200">
              Per-Quiz Standings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time rankings based on official quiz scores. Private answers remain confidential.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-medium self-start sm:self-auto">
          {publishedProcesses.length} Quizzes Available
        </div>
      </div>

      {/* Horizontal Quiz / Process Selector Tabs */}
      <div>
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Select Quiz / Process:
        </span>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {publishedProcesses.map((proc) => {
            const isSelected = activeProcess?.id === proc.id;
            const subCount = submissions.filter((s) => s.processId === proc.id).length;

            return (
              <button
                key={proc.id}
                onClick={() => setSelectedProcessId(proc.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent shadow-md shadow-purple-500/20 scale-[1.02]'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <span>{proc.title}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {subCount} {subCount === 1 ? 'cert' : 'certs'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Process Meta Banner */}
      {activeProcess && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/70 via-slate-50 to-indigo-50/50 border border-purple-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-purple-900">{activeProcess.title}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">{activeProcess.category}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 font-semibold">
            <span>{activeProcess.quiz.questions.length} Questions</span>
            <span>•</span>
            <span>{activeProcess.quiz.totalMarks} Total Marks</span>
            <span>•</span>
            <span className="text-emerald-700 font-bold">80% Passing Bar</span>
          </div>
        </div>
      )}

      {/* Horizontal Leaderboard Table: Rank | Agent Name | Quiz Score | Percentage */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5 w-20">Rank</th>
                <th className="py-3.5 px-5">Agent Name</th>
                <th className="py-3.5 px-5 text-center">Quiz Score</th>
                <th className="py-3.5 px-5 text-right">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {agentBestSubmissions.length > 0 ? (
                agentBestSubmissions.map((sub, index) => {
                  const rank = index + 1;
                  const isCurrentAgent = currentAgentId === sub.agentId;
                  const matchingAgent = agents.find((a) => a.id === sub.agentId);
                  const agentInitial = sub.agentInitial || matchingAgent?.initial || 'A';
                  const agentColor =
                    sub.agentColor ||
                    matchingAgent?.colorClass ||
                    'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white';

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCurrentAgent ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      {/* Rank Column */}
                      <td className="py-3.5 px-5 font-black text-slate-700">
                        <div className="flex items-center gap-1.5">
                          {rank === 1 ? (
                            <span className="text-lg">🥇</span>
                          ) : rank === 2 ? (
                            <span className="text-lg">🥈</span>
                          ) : rank === 3 ? (
                            <span className="text-lg">🥉</span>
                          ) : (
                            <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                              #{rank}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Agent Name Column */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0 ${agentColor}`}
                          >
                            {agentInitial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{sub.agentName}</span>
                              {isCurrentAgent && (
                                <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                              {sub.team}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Quiz Score Column */}
                      <td className="py-3.5 px-5 text-center font-extrabold text-slate-700">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                          {sub.score} / {sub.totalMarks} pts
                        </span>
                      </td>

                      {/* Percentage Column */}
                      <td className="py-3.5 px-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span
                            className={`font-black text-sm sm:text-base ${
                              sub.percentage >= 90
                                ? 'text-emerald-600'
                                : sub.percentage >= 80
                                ? 'text-indigo-600'
                                : 'text-amber-600'
                            }`}
                          >
                            {sub.percentage}%
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                              sub.percentage >= 80
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {sub.percentage >= 80 ? 'Passed' : 'Review'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-[28px] text-slate-300 block mb-1">
                      military_tech
                    </span>
                    <p className="text-xs font-bold text-slate-600">No submissions for this quiz yet</p>
                    <p className="text-[11px] text-slate-400">
                      Rankings will update automatically as soon as agents submit their quiz.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
