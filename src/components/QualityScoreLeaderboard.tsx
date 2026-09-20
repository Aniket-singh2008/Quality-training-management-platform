import React, { useState } from 'react';
import { Agent } from '../types';

interface QualityScoreLeaderboardProps {
  agents: Agent[];
  currentAgentId?: string;
  isAdmin?: boolean;
  onUpdateQualityScore?: (agentId: string, newScore: number) => void;
  onManageAgent?: (agent: Agent) => void;
}

export const QualityScoreLeaderboard: React.FC<QualityScoreLeaderboardProps> = ({
  agents,
  currentAgentId,
  isAdmin = false,
  onUpdateQualityScore,
  onManageAgent
}) => {
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editScoreValue, setEditScoreValue] = useState<number>(90);

  // Sort agents by quality score descending
  const sortedAgents = [...agents].sort((a, b) => {
    const scoreA = a.qualityScore ?? a.score ?? 0;
    const scoreB = b.qualityScore ?? b.score ?? 0;
    return scoreB - scoreA;
  });

  const handleStartEdit = (agent: Agent) => {
    setEditingAgentId(agent.id);
    setEditScoreValue(agent.qualityScore ?? agent.score ?? 90);
  };

  const handleSaveEdit = (agentId: string) => {
    if (onUpdateQualityScore) {
      onUpdateQualityScore(agentId, Math.min(100, Math.max(0, editScoreValue)));
    }
    setEditingAgentId(null);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">Quality Score Leaderboard</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
              QA Calibrated
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Rankings maintained via Admin QA calibrations. You can update scores directly.'
              : 'Official team Quality Score standings. Other agents’ private fatal and call records remain confidential.'}
          </p>
        </div>

        <div className="text-xs text-slate-400 font-medium self-start sm:self-auto flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{sortedAgents.length} Agents Ranked</span>
        </div>
      </div>

      {/* Horizontal Table: Rank | Agent Name | Quality Score */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-5 w-20">Rank</th>
                <th className="py-3.5 px-5">Agent Name</th>
                <th className="py-3.5 px-5 text-right">Quality Score</th>
                {isAdmin && <th className="py-3.5 px-5 text-right w-36">Admin Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {sortedAgents.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">verified</span>
                    <p className="text-xs font-semibold text-slate-600">No agents found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Quality scores will appear here as agents are added and calibrated.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedAgents.map((agent, index) => {
                  const rank = index + 1;
                  const score = agent.qualityScore ?? agent.score ?? 0;
                  const isCurrentAgent = currentAgentId === agent.id;
                  const isEditing = editingAgentId === agent.id;

                return (
                  <tr
                    key={agent.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrentAgent ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    {/* Rank */}
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

                    {/* Agent Name */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0 ${agent.colorClass}`}
                        >
                          {agent.initial}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{agent.name}</span>
                            {isCurrentAgent && (
                              <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-black">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {agent.email ? `${agent.email} • ` : ''}{agent.team} • {agent.role}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Quality Score */}
                    <td className="py-3.5 px-5 text-right">
                      {isEditing && isAdmin ? (
                        <div className="inline-flex items-center gap-2 justify-end">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={editScoreValue}
                            onChange={(e) => setEditScoreValue(Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-white border-2 border-indigo-500 rounded-lg text-xs font-black text-center outline-none focus:ring-2 focus:ring-indigo-300"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(agent.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingAgentId(null)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2.5 justify-end">
                          <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full ${
                                score >= 90
                                  ? 'bg-emerald-500'
                                  : score >= 80
                                  ? 'bg-indigo-600'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(score, 100)}%` }}
                            />
                          </div>
                          <span
                            className={`font-black text-sm sm:text-base ${
                              score >= 90
                                ? 'text-emerald-600'
                                : score >= 80
                                ? 'text-indigo-600'
                                : 'text-rose-600'
                            }`}
                          >
                            {score}%
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Admin Action (Only visible to Admin!) */}
                    {isAdmin && (
                      <td className="py-3.5 px-5 text-right">
                        {!isEditing && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(agent)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Quick edit Quality Score"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                              <span>Calibrate</span>
                            </button>
                            {onManageAgent && (
                              <button
                                onClick={() => onManageAgent(agent)}
                                className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold cursor-pointer"
                                title="Full Agent Management"
                              >
                                Full
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
