import React, { useState } from 'react';
import { AuditProcess, ActivityItem, Agent, Submission, PerformanceImportRow } from '../types';
import { QuizLeaderboard } from './QuizLeaderboard';
import { QualityScoreLeaderboard } from './QualityScoreLeaderboard';
import { ImportPerformanceCard } from './ImportPerformanceCard';

interface DashboardViewProps {
  processes: AuditProcess[];
  activities: ActivityItem[];
  agents: Agent[];
  submissions?: Submission[];
  onNavigate: (tab: string) => void;
  onSelectProcess: (process: AuditProcess) => void;
  onResolveAlert: (alertId: string) => void;
  onOpenAddAgent: () => void;
  onOpenImportPerformance?: () => void;
  onConfirmImportPerformance?: (rows: PerformanceImportRow[]) => void;
  onOpenProcessDetail?: (process: AuditProcess) => void;
  onManageAgent?: (agent: Agent) => void;
  onUpdateAgentPerformance?: (
    agentId: string,
    updates: { qualityScore: number; fatalCount: number; callAuditCount: number }
  ) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  processes,
  activities,
  agents,
  submissions = [],
  onNavigate,
  onSelectProcess,
  onResolveAlert,
  onOpenAddAgent,
  onOpenImportPerformance,
  onConfirmImportPerformance,
  onOpenProcessDetail,
  onManageAgent,
  onUpdateAgentPerformance
}) => {
  const [chartTimeframe, setChartTimeframe] = useState<'7D' | '30D' | 'Qtr'>('7D');
  const [editingAgentMetrics, setEditingAgentMetrics] = useState<Agent | null>(null);
  const [metricForm, setMetricForm] = useState({
    qualityScore: 90,
    fatalCount: 0,
    callAuditCount: 25
  });

  const publishedSops = processes.filter((p) => p.status === 'Published');
  const totalSubmissionsCount = submissions.length || 14;
  const avgQualityScore = (
    agents.reduce((sum, a) => sum + (a.qualityScore ?? a.score ?? 0), 0) / (agents.length || 1)
  ).toFixed(1);

  const chartDataMap = {
    '7D': {
      points: [
        { day: 'Mon', score: 81, x: 20, y: 76 },
        { day: 'Tue', score: 83, x: 75, y: 68 },
        { day: 'Wed', score: 84, x: 130, y: 64 },
        { day: 'Thu', score: 82, x: 185, y: 72 },
        { day: 'Fri', score: 86, x: 240, y: 56 },
        { day: 'Sat', score: 85, x: 295, y: 60 },
        { day: 'Sun', score: 87, x: 350, y: 52 }
      ],
      pathD: 'M 20 76 C 45 72, 55 69, 75 68 C 100 66, 110 65, 130 64 C 155 64, 165 71, 185 72 C 210 73, 220 58, 240 56 C 265 54, 275 61, 295 60 C 320 59, 335 54, 350 52',
      areaD: 'M 20 76 C 45 72, 55 69, 75 68 C 100 66, 110 65, 130 64 C 155 64, 165 71, 185 72 C 210 73, 220 58, 240 56 C 265 54, 275 61, 295 60 C 320 59, 335 54, 350 52 L 350 110 L 20 110 Z',
      change: '+3.2%',
      currentAvg: '87.4%'
    },
    '30D': {
      points: [
        { day: 'W1', score: 79, x: 20, y: 84 },
        { day: 'W2', score: 82, x: 130, y: 72 },
        { day: 'W3', score: 85, x: 240, y: 60 },
        { day: 'W4', score: 88, x: 350, y: 48 }
      ],
      pathD: 'M 20 84 C 70 80, 80 74, 130 72 C 180 70, 190 62, 240 60 C 290 58, 310 50, 350 48',
      areaD: 'M 20 84 C 70 80, 80 74, 130 72 C 180 70, 190 62, 240 60 C 290 58, 310 50, 350 48 L 350 110 L 20 110 Z',
      change: '+5.8%',
      currentAvg: '88.0%'
    },
    'Qtr': {
      points: [
        { day: 'M1', score: 75, x: 20, y: 92 },
        { day: 'M2', score: 82, x: 185, y: 72 },
        { day: 'M3', score: 87, x: 350, y: 52 }
      ],
      pathD: 'M 20 92 C 90 85, 110 75, 185 72 C 260 69, 280 55, 350 52',
      areaD: 'M 20 92 C 90 85, 110 75, 185 72 C 260 69, 280 55, 350 52 L 350 110 L 20 110 Z',
      change: '+12.4%',
      currentAvg: '87.4%'
    }
  };

  const currentChart = chartDataMap[chartTimeframe];

  // Top agents for leaderboard preview
  const topAgents = [...agents].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="flex flex-col w-full gap-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-300">
      {/* 1. HERO / HEADER SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/20">
        {/* Subtle decorative glowing background shapes */}
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-white mb-3 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live QA Operations • Q4 Audit Cycle</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back, Admin 👋
            </h1>
            <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed font-normal">
              Track real-time agent calibration, create SOP compliance rubrics, and certify your teams with automated quiz benchmarks.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('new-audit')}
              className="px-4 py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-black/10 hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-indigo-600">add_circle</span>
              <span>Create Process</span>
            </button>

            <button
              onClick={onOpenAddAgent}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              <span>Add Agent</span>
            </button>

            {onOpenImportPerformance && (
              <button
                onClick={onOpenImportPerformance}
                className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[20px]">upload_file</span>
                <span>Import Performance Data</span>
              </button>
            )}

            <button
              onClick={() => onNavigate('analytics')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">insights</span>
              <span>View Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. COLORFUL GRADIENT KPI CARDS (Total Agents, Published SOPs, Submissions, Average Score) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Agents (Blue/Indigo Gradient) */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/15 group hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">
              Total Agents
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{agents.length}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">verified</span>
              Active
            </span>
          </div>
          <p className="mt-2 text-xs text-blue-100/80">Across 4 operational squads</p>
        </div>

        {/* Card 2: Published SOPs (Emerald/Teal Gradient) */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white shadow-lg shadow-emerald-500/15 group hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Published SOPs
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{publishedSops.length}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">check</span>
              Live
            </span>
          </div>
          <p className="mt-2 text-xs text-emerald-100/80">
            {processes.length - publishedSops.length} Draft SOPs in QA review
          </p>
        </div>

        {/* Card 3: Submissions (Amber/Orange Gradient) */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white shadow-lg shadow-orange-500/15 group hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100">
              Submissions
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{totalSubmissionsCount}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-0.5">
              Recorded
            </span>
          </div>
          <p className="mt-2 text-xs text-amber-100/80">Graded certifications &amp; scorecards</p>
        </div>

        {/* Card 4: Average Score (Violet/Purple Gradient) */}
        <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white shadow-lg shadow-purple-500/15 group hover:-translate-y-1 transition-all duration-300">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-100">
              Average Score
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[20px]">grade</span>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{avgQualityScore}%</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">trending_up</span>
              +3.2%
            </span>
          </div>
          <p className="mt-2 text-xs text-purple-100/80">Squad Quality benchmark (Pass bar 80%)</p>
        </div>
      </div>

      {/* 3. PERFORMANCE CHART & LEADERBOARD PREVIEW GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart Card (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800">Team Score Trends</h2>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200/60 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    {currentChart.change}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aggregate quiz calibration scores across operational departments
                </p>
              </div>

              {/* Timeframe Switcher */}
              <div className="inline-flex bg-slate-100 p-1 rounded-xl self-start">
                {(['7D', '30D', 'Qtr'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setChartTimeframe(period)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      chartTimeframe === period
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Area Chart */}
            <div className="relative w-full h-44 my-2">
              <svg viewBox="0 0 370 120" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="modernAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="modernLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="20" y1="30" x2="350" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="20" y1="60" x2="350" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                <line x1="20" y1="90" x2="350" y2="90" stroke="#f1f5f9" strokeWidth="1" />

                {/* 85% Target Line */}
                <line
                  x1="20"
                  y1="58"
                  x2="350"
                  y2="58"
                  stroke="#10b981"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <text x="310" y="54" fill="#059669" fontSize="9" fontWeight="700">
                  Target 85%
                </text>

                {/* Area Fill */}
                <path d={currentChart.areaD} fill="url(#modernAreaGrad)" />

                {/* Line Path */}
                <path
                  d={currentChart.pathD}
                  fill="none"
                  stroke="url(#modernLineGrad)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {currentChart.points.map((pt, i) => (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="4"
                      className="fill-white stroke-indigo-600 stroke-2 hover:r-6 transition-all cursor-pointer"
                    />
                    <text
                      x={pt.x}
                      y="114"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="9"
                      fontWeight="600"
                    >
                      {pt.day}
                    </text>
                  </g>
                ))}

                {/* Pulsing today marker on the last point */}
                <g>
                  <circle
                    cx={currentChart.points[currentChart.points.length - 1].x}
                    cy={currentChart.points[currentChart.points.length - 1].y}
                    r="8"
                    className="fill-indigo-400/30 animate-ping"
                  />
                  <circle
                    cx={currentChart.points[currentChart.points.length - 1].x}
                    cy={currentChart.points[currentChart.points.length - 1].y}
                    r="5"
                    className="fill-indigo-600 stroke-2 stroke-white shadow-md"
                  />
                </g>
              </svg>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Current Avg: <strong className="text-slate-800">{currentChart.currentAvg}</strong>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Target: <strong className="text-slate-800">85.0%</strong>
              </span>
            </div>
            <button
              onClick={() => onNavigate('analytics')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Explore Analytics</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Leaderboard Preview Card (1 Column) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Top Performers</h2>
                <p className="text-xs text-slate-500">Live calibration ranking</p>
              </div>
              <button
                onClick={() => onNavigate('leaderboard')}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Top 3 Podium List */}
            <div className="space-y-3">
              {topAgents.map((agent, index) => {
                const badgeColor =
                  index === 0
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : index === 1
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-orange-100 text-orange-800 border-orange-300';
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';

                return (
                  <div
                    key={agent.id}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/60 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-xs ${agent.colorClass}`}
                        >
                          {agent.initial}
                        </div>
                        <span className="absolute -top-1.5 -left-1 text-sm">{medal}</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{agent.name}</p>
                        <p className="text-[11px] text-slate-500">{agent.team}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-extrabold text-indigo-600 block">
                        {agent.score}%
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {agent.completedProcesses} SOPs done
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Squad Average footer */}
          <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-100 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Leading Squad:</span>
            <span className="font-bold text-indigo-700">Customer Success (94%)</span>
          </div>
        </div>
      </div>

      {/* 3.5 DEDICATED AGENT PERFORMANCE & CALIBRATION SECTION */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-600 text-[24px]">
                manage_accounts
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Agent Performance &amp; Calibration
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live squad metrics: Quality Scores, Fatal Incident counts, and Evaluated Call Audits.
            </p>
          </div>

          <button
            onClick={() => onNavigate('agents')}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Open Full Agent Manager</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Agent Name</th>
                <th className="py-3 px-4">Squad</th>
                <th className="py-3 px-4">Quality Score</th>
                <th className="py-3 px-4">Fatal Count</th>
                <th className="py-3 px-4">Call Audits</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {agents.map((agent) => {
                const qScore = agent.qualityScore ?? agent.score ?? 90;
                const fCount = agent.fatalCount ?? 0;
                const cCount = agent.callAuditCount ?? 30;

                return (
                  <tr key={agent.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-xs ${agent.colorClass}`}
                        >
                          {agent.initial}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{agent.name}</p>
                          <p className="text-[11px] text-slate-400">{agent.role}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold">
                        {agent.team}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black ${
                            qScore >= 80 ? 'text-slate-900' : 'text-rose-600'
                          }`}
                        >
                          {qScore}%
                        </span>
                        <div className="w-14 h-1.5 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full ${
                              qScore >= 90
                                ? 'bg-emerald-500'
                                : qScore >= 80
                                ? 'bg-indigo-600'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(qScore, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          fCount === 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {fCount === 0 ? 'check' : 'priority_high'}
                        </span>
                        {fCount === 0 ? '0 Fatals' : `${fCount} Fatals`}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-700">{cCount}</td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingAgentMetrics(agent);
                            setMetricForm({
                              qualityScore: agent.qualityScore ?? agent.score ?? 90,
                              fatalCount: agent.fatalCount ?? 0,
                              callAuditCount: agent.callAuditCount ?? 30
                            });
                          }}
                          className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                          title="Quick calibrate performance metrics"
                        >
                          <span className="material-symbols-outlined text-[14px]">tune</span>
                          <span>Calibrate</span>
                        </button>
                        <button
                          onClick={() => {
                            if (onManageAgent) {
                              onManageAgent(agent);
                            } else {
                              onNavigate('agents');
                            }
                          }}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
                        >
                          Profile
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* QUIZ LEADERBOARD (Per-Process Rankings)                                    */}
      {/* Admin can select any quiz to view standings                               */}
      {/* ========================================================================= */}
      <QuizLeaderboard
        processes={processes}
        submissions={submissions}
        agents={agents}
        isAdmin={true}
      />

      {/* ========================================================================= */}
      {/* IMPORT PERFORMANCE DATA FROM PDF                                           */}
      {/* Admin can upload QA report PDF, preview updates, and sync to database      */}
      {/* ========================================================================= */}
      <ImportPerformanceCard
        agents={agents}
        onConfirmImport={(rows) => {
          if (onConfirmImportPerformance) {
            onConfirmImportPerformance(rows);
          }
        }}
        onOpenFullModal={onOpenImportPerformance}
      />

      {/* ========================================================================= */}
      {/* QUALITY SCORE LEADERBOARD                                                  */}
      {/* Admin can update scores and view rankings                                  */}
      {/* ========================================================================= */}
      <QualityScoreLeaderboard
        agents={agents}
        isAdmin={true}
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
        onManageAgent={(agent) => {
          setEditingAgentMetrics(agent);
          setMetricForm({
            qualityScore: agent.qualityScore ?? agent.score ?? 90,
            fatalCount: agent.fatalCount ?? 0,
            callAuditCount: agent.callAuditCount ?? 30
          });
        }}
      />

      {/* ========================================================================= */}
      {/* 4. PUBLISHED PROCESS UPDATES (Responsive Horizontal Grid)                  */}
      {/* Admin: 3 cards per row on desktop, 2 on tablet, 1 on mobile               */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-[24px]">auto_stories</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                    Published Process Updates
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    {publishedSops.length} Live SOPs
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard operating procedures, compliance standards, and single-attempt certification quizzes.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => onNavigate('updates')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>View All ({processes.length})</span>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
            <button
              onClick={() => onNavigate('new-audit')}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Process</span>
            </button>
          </div>
        </div>

        {/* Process Updates Horizontal Responsive Grid */}
        {/* Desktop: 3 cards per row | Tablet: 2 cards per row | Mobile: 1 card per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {publishedSops.map((proc) => {
            const rate = proc.metrics?.completionRate ?? 0;
            const publishedDate = proc.effectiveDate || proc.metrics?.publishedDate || 'Published';

            return (
              <div
                key={proc.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 hover:border-indigo-400 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                      {proc.category}
                    </span>

                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      <span>{proc.status}</span>
                    </span>
                  </div>

                  {/* Process / SOP Name */}
                  <h3
                    onClick={() => {
                      if (onOpenProcessDetail) {
                        onOpenProcessDetail(proc);
                      } else {
                        onSelectProcess(proc);
                      }
                    }}
                    className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
                    title={proc.title}
                  >
                    {proc.title}
                  </h3>

                  {/* Short Description */}
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                    {proc.shortDescription}
                  </p>

                  {/* Meta Strip: Published Date & Number of Questions */}
                  <div className="mt-4 p-2.5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">
                        calendar_today
                      </span>
                      <span className="font-medium text-slate-700">{publishedDate}</span>
                    </div>

                    <div className="flex items-center gap-1.5 font-bold text-indigo-600">
                      <span className="material-symbols-outlined text-[16px]">quiz</span>
                      <span>{proc.quiz.questions.length} Questions</span>
                    </div>
                  </div>

                  {/* Compliance / Team Certification Progress */}
                  <div className="mt-3.5">
                    <div className="flex items-center justify-between text-[11px] mb-1 font-medium">
                      <span className="text-slate-400">Team Certification</span>
                      <span className="font-bold text-slate-800">{rate}% Certified</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          rate >= 90 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* View / Edit Actions Footer */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onOpenProcessDetail) {
                        onOpenProcessDetail(proc);
                      } else {
                        onSelectProcess(proc);
                      }
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 group/btn"
                  >
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    <span>View Process</span>
                  </button>

                  <button
                    onClick={() => onSelectProcess(proc)}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                    title="Edit Workflow & Quiz in Builder"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. LIVE ACTIVITY AUDIT STREAM                                              */}
      {/* Real-time operational activity, high score alerts, and calibration logs    */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-800">Live Activity Feed</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              Auto-sync 30s
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Real-time compliance audit trail &amp; certifications
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activities.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/60 hover:bg-slate-100/70 transition-all flex items-start gap-3"
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  item.type === 'alert'
                    ? 'bg-rose-100 text-rose-600'
                    : item.type === 'high_score'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {item.type === 'alert'
                    ? 'warning'
                    : item.type === 'high_score'
                    ? 'star'
                    : 'verified'}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-700 leading-snug">
                  <strong className="text-slate-900 font-semibold">{item.userName}</strong>{' '}
                  {item.text}{' '}
                  {item.highlight && (
                    <span className="font-semibold text-indigo-600">{item.highlight}</span>
                  )}
                </p>

                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-400">{item.timestamp}</span>

                  <div className="flex items-center gap-1.5">
                    {item.actionText && (
                      <button
                        onClick={() => onResolveAlert(item.id)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        {item.actionText}
                      </button>
                    )}

                    {item.scoreBadge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        {item.scoreBadge}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center">
          <span className="text-[11px] text-slate-400">All agent actions are audited &amp; encrypted</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADMIN AGENT CALIBRATION MODAL                                             */}
      {/* Ability to manage individual agent Quality Score, Fatal Count, & Audits   */}
      {/* ========================================================================= */}
      {editingAgentMetrics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs ${editingAgentMetrics.colorClass}`}
                >
                  {editingAgentMetrics.initial}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Calibrate Agent Metrics
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {editingAgentMetrics.name} • {editingAgentMetrics.team}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingAgentMetrics(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Agent Name (Locked)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingAgentMetrics.name}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Quality Score (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={metricForm.qualityScore}
                    onChange={(e) =>
                      setMetricForm((prev) => ({
                        ...prev,
                        qualityScore: Math.min(100, Math.max(0, Number(e.target.value)))
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900 font-bold outline-none transition-all"
                  />
                  <span className="absolute right-3.5 top-2.5 text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Passing standard: 80%</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fatal Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={metricForm.fatalCount}
                    onChange={(e) =>
                      setMetricForm((prev) => ({
                        ...prev,
                        fatalCount: Math.max(0, Number(e.target.value))
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900 font-bold outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">0 = Compliant</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Call Audit Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={metricForm.callAuditCount}
                    onChange={(e) =>
                      setMetricForm((prev) => ({
                        ...prev,
                        callAuditCount: Math.max(0, Number(e.target.value))
                      }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-slate-900 font-bold outline-none transition-all"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Total evaluated calls</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setEditingAgentMetrics(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onUpdateAgentPerformance && editingAgentMetrics) {
                    onUpdateAgentPerformance(editingAgentMetrics.id, {
                      qualityScore: metricForm.qualityScore,
                      fatalCount: metricForm.fatalCount,
                      callAuditCount: metricForm.callAuditCount
                    });
                  }
                  setEditingAgentMetrics(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
