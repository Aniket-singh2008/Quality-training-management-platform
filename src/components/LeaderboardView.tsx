import React, { useState } from 'react';
import { Agent, Submission, AuditProcess } from '../types';
import { QuizLeaderboard } from './QuizLeaderboard';
import { QualityScoreLeaderboard } from './QualityScoreLeaderboard';

interface LeaderboardViewProps {
  agents: Agent[];
  submissions?: Submission[];
  processes?: AuditProcess[];
  currentAgentId?: string;
  isAdmin?: boolean;
  onUpdateAgentPerformance?: (
    agentId: string,
    updates: { qualityScore: number; fatalCount: number; callAuditCount: number }
  ) => void;
  onRemindAgent?: (agent: Agent) => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  agents,
  submissions = [],
  processes = [],
  currentAgentId,
  isAdmin = false,
  onUpdateAgentPerformance
}) => {
  const [activeBoardTab, setActiveBoardTab] = useState<'both' | 'quiz' | 'quality'>('both');

  const topAgent = [...agents].sort(
    (a, b) => (b.qualityScore ?? b.score ?? 0) - (a.qualityScore ?? a.score ?? 0)
  )[0];

  return (
    <div className="flex flex-col w-full gap-6 max-w-7xl mx-auto pb-24 animate-in fade-in duration-300">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/20">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-purple-100 mb-2 backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Official Rankings • Real-Time Synchronization</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ProcessHub Leaderboards 🏆
            </h1>
            <p className="text-xs sm:text-sm text-purple-100/90 mt-1 max-w-2xl font-medium">
              Two separate official leaderboards: per-process <strong>Quiz Leaderboard</strong> based
              on assessment scores and the <strong>Quality Score Leaderboard</strong> based on QA
              calibrations.
            </p>
          </div>

          {/* Quick Stat Pill */}
          {topAgent && (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-xs">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${topAgent.colorClass}`}
              >
                👑
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                  Top Calibrated Performer
                </span>
                <p className="font-extrabold text-sm text-white">{topAgent.name}</p>
                <p className="text-[11px] text-purple-200">
                  {topAgent.qualityScore ?? topAgent.score ?? 90}% Quality Score • {topAgent.team}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Leaderboard View Filter Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">View Leaderboard:</span>
          <div className="inline-flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveBoardTab('both')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeBoardTab === 'both'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Both Leaderboards
            </button>
            <button
              onClick={() => setActiveBoardTab('quiz')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBoardTab === 'quiz'
                  ? 'bg-white text-purple-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">quiz</span>
              <span>Quiz Leaderboard</span>
            </button>
            <button
              onClick={() => setActiveBoardTab('quality')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeBoardTab === 'quality'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span>Quality Score Leaderboard</span>
            </button>
          </div>
        </div>

        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
          <span className="material-symbols-outlined text-[15px] text-emerald-600">lock</span>
          <span>Private answers &amp; fatal details kept strictly confidential</span>
        </div>
      </div>

      {/* 3. QUIZ LEADERBOARD SECTION */}
      {(activeBoardTab === 'both' || activeBoardTab === 'quiz') && (
        <QuizLeaderboard
          processes={processes}
          submissions={submissions}
          agents={agents}
          currentAgentId={currentAgentId}
          isAdmin={isAdmin}
        />
      )}

      {/* 4. QUALITY SCORE LEADERBOARD SECTION */}
      {(activeBoardTab === 'both' || activeBoardTab === 'quality') && (
        <QualityScoreLeaderboard
          agents={agents}
          currentAgentId={currentAgentId}
          isAdmin={isAdmin}
          onUpdateQualityScore={(agentId, newScore) => {
            const targetAgent = agents.find((a) => a.id === agentId);
            if (onUpdateAgentPerformance && targetAgent) {
              onUpdateAgentPerformance(agentId, {
                qualityScore: newScore,
                fatalCount: targetAgent.fatalCount ?? 0,
                callAuditCount: targetAgent.callAuditCount ?? 30
              });
            }
          }}
        />
      )}
    </div>
  );
};
