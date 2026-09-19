import React, { useState } from 'react';
import { AuditProcess, Agent, Submission } from '../types';
import { HorizontalScorecard } from './HorizontalScorecard';
import { QuizLeaderboard } from './QuizLeaderboard';
import { QualityScoreLeaderboard } from './QualityScoreLeaderboard';

interface AgentDashboardViewProps {
  currentAgent: Agent;
  allAgents?: Agent[];
  processes: AuditProcess[];
  submissions: Submission[];
  onOpenProcess: (process: AuditProcess) => void;
  onNavigate: (tab: string) => void;
  onSwitchAgent?: (agentId: string) => void;
}

export const AgentDashboardView: React.FC<AgentDashboardViewProps> = ({
  currentAgent,
  allAgents = [],
  processes,
  submissions,
  onOpenProcess,
  onNavigate,
  onSwitchAgent
}) => {
  const [selectedScorecardSub, setSelectedScorecardSub] = useState<Submission | null>(null);

  // Filter processes that are Published (available for agents)
  const publishedProcesses = processes.filter((p) => p.status === 'Published');

  // AGENT PRIVACY: Only get THIS agent's submissions
  const mySubmissions = submissions.filter((s) => s.agentId === currentAgent.id);

  // Set of completed process IDs for this agent
  const myCompletedProcessIds = new Set(mySubmissions.map((s) => s.processId));

  // PENDING QUIZZES: Only quizzes that the agent has NOT submitted yet
  const pendingQuizzes = publishedProcesses.filter((p) => !myCompletedProcessIds.has(p.id));

  // Performance metrics for current agent
  const fatalCount = currentAgent.fatalCount ?? 0;
  const qualityScore = currentAgent.qualityScore ?? currentAgent.score ?? 90;
  const callAuditCount = currentAgent.callAuditCount ?? 30;

  return (
    <div className="flex flex-col w-full gap-7 max-w-7xl mx-auto pb-24 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* 1. HEADER: My Dashboard & Agent Name                                       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-8 text-white shadow-xl shadow-indigo-900/20">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg ring-4 ring-white/20 ${currentAgent.colorClass}`}
              >
                {currentAgent.initial}
              </div>
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black flex items-center gap-0.5 shadow-sm">
                Rank #{currentAgent.rank || 1}
              </span>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold text-purple-100 mb-1 backdrop-blur-xs">
                <span>My Dashboard</span>
                <span>•</span>
                <span>{currentAgent.team}</span>
                <span>•</span>
                <span>{currentAgent.role}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {currentAgent.name}
              </h1>
              <p className="text-xs sm:text-sm text-purple-100/90 mt-0.5 font-medium">
                Confidential Agent View • Real-time Quality &amp; Process Training Portal
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Agent Switcher for easy testing across multiple agent accounts */}
            {allAgents.length > 0 && onSwitchAgent && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
                <span className="text-purple-200 font-medium hidden sm:inline">Active Agent:</span>
                <select
                  value={currentAgent.id}
                  onChange={(e) => onSwitchAgent(e.target.value)}
                  className="bg-purple-900/80 text-white font-bold text-xs rounded-lg px-2 py-1 outline-none border border-purple-400/40 cursor-pointer"
                >
                  {allAgents.map((ag) => (
                    <option key={ag.id} value={ag.id} className="bg-slate-900 text-white">
                      {ag.name} ({ag.team})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => onNavigate('leaderboard')}
              className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">leaderboard</span>
              <span>Team Leaderboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MY PERFORMANCE: [ Quality Score ] [ Fatal Count ] [ Call Audit Count ]  */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 text-[20px]">
              monitoring
            </span>
            <h2 className="text-base font-extrabold uppercase tracking-wider text-slate-700 text-xs">
              My Performance
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-400">
            Official QA Calibrated Metrics
          </span>
        </div>

        {/* Horizontal Row of 3 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Quality Score */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex items-center justify-between group">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Quality Score
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{qualityScore}%</span>
                <span
                  className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                    qualityScore >= 80
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {qualityScore >= 80 ? 'Target Met ✓' : 'Needs Review'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Passing standard: 80%</p>
            </div>

            {/* Circular SVG Gauge */}
            <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
              <svg className="w-16 h-16 -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  className="stroke-slate-100"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="25"
                  className={`transition-all duration-1000 ease-out ${
                    qualityScore >= 90
                      ? 'stroke-emerald-500'
                      : qualityScore >= 80
                      ? 'stroke-indigo-600'
                      : 'stroke-rose-500'
                  }`}
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 25}
                  strokeDashoffset={2 * Math.PI * 25 * (1 - Math.min(qualityScore, 100) / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xs font-black text-slate-800">
                {qualityScore}%
              </span>
            </div>
          </div>

          {/* Card 2: Fatal Count */}
          <div
            className={`rounded-3xl p-5 text-white shadow-sm hover:shadow-md transition-all flex items-center justify-between ${
              fatalCount === 0
                ? 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-500/10'
                : fatalCount <= 2
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/10'
                : 'bg-gradient-to-br from-rose-600 to-red-700 shadow-rose-500/10'
            }`}
          >
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                Fatal Count
              </span>
              <div className="mt-1 text-3xl font-black">{fatalCount}</div>
              <p className="text-xs text-white/90 mt-1 font-medium">
                {fatalCount === 0 ? 'Zero tolerance compliant ✓' : `${fatalCount} QA fatals logged`}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">
                {fatalCount === 0 ? 'gpp_good' : 'warning'}
              </span>
            </div>
          </div>

          {/* Card 3: Call Audit Count */}
          <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-3xl p-5 text-white shadow-sm hover:shadow-md shadow-indigo-500/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">
                Call Audit Count
              </span>
              <div className="mt-1 text-3xl font-black">{callAuditCount}</div>
              <p className="text-xs text-blue-100/90 mt-1 font-medium">
                Evaluated recorded calls &amp; interactions
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">headset_mic</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 3. PROCESS UPDATES & SOPS (Responsive Horizontal Grid)                     */}
      {/* Agent: 3 cards per row on desktop, 2 on tablet, 1 on mobile               */}
      {/* Cards wrap naturally; Completed processes remain visible permanently!     */}
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
                    Process Updates &amp; SOPs
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                    {publishedProcesses.length} SOPs Available
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Standard Operating Procedures remain permanently available here. Completed SOPs stay accessible for reference.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Always Accessible</span>
            </span>
          </div>
        </div>

        {/* Process Updates Horizontal Responsive Grid */}
        {/* Desktop: 3 cards per row | Tablet: 2 cards per row | Mobile: 1 card per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {publishedProcesses.map((proc) => {
            const isCompleted = myCompletedProcessIds.has(proc.id);
            const mySub = mySubmissions.find((s) => s.processId === proc.id);

            return (
              <div
                key={proc.id}
                className={`p-5 sm:p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between group ${
                  isCompleted
                    ? 'border-emerald-200 bg-gradient-to-b from-white via-slate-50/40 to-emerald-50/20 hover:border-emerald-400 hover:shadow-lg'
                    : 'border-slate-200/80 bg-white hover:border-indigo-400 hover:shadow-lg'
                }`}
              >
                <div>
                  {/* Top Bar: Category & Status (Pending / Completed) */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                      {proc.category}
                    </span>

                    {/* Status: Pending / Completed */}
                    {isCompleted ? (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">check_circle</span>
                        <span>Completed</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">schedule</span>
                        <span>Pending</span>
                      </span>
                    )}
                  </div>

                  {/* Process/SOP Name */}
                  <h3
                    onClick={() => onOpenProcess(proc)}
                    className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
                    title={proc.title}
                  >
                    {proc.title}
                  </h3>

                  {/* Short Description */}
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                    {proc.shortDescription}
                  </p>

                  {/* Meta Strip: Number of Questions & Published Date */}
                  <div className="mt-4 p-2.5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-600">
                      <span className="material-symbols-outlined text-[16px]">quiz</span>
                      <span>{proc.quiz.questions.length} Questions</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                      <span className="material-symbols-outlined text-[14px] text-slate-400">
                        calendar_today
                      </span>
                      <span>{proc.effectiveDate}</span>
                    </div>
                  </div>

                  {/* Score if Completed / Pending Status */}
                  <div className="mt-3">
                    {isCompleted && mySub ? (
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-semibold">
                          <span className="material-symbols-outlined text-[16px] text-emerald-600">
                            workspace_premium
                          </span>
                          <span>Score:</span>
                        </div>
                        <span className="font-extrabold text-emerald-800">
                          {mySub.percentage}% ({mySub.percentage >= 80 ? 'Certified ✓' : 'Completed'})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-slate-400">
                            hourglass_top
                          </span>
                          <span>Score:</span>
                        </div>
                        <span className="font-semibold text-amber-600">Quiz Pending</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Open Process Button */}
                <div className="mt-5 pt-3.5 border-t border-slate-100">
                  <button
                    onClick={() => onOpenProcess(proc)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 group/btn ${
                      isCompleted
                        ? 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800 shadow-xs'
                        : 'bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 shadow-xs'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isCompleted ? 'menu_book' : 'launch'}
                    </span>
                    <span>Open Process</span>
                    <span className="material-symbols-outlined text-[14px] ml-auto transition-transform group-hover/btn:translate-x-0.5">
                      arrow_forward
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PENDING QUIZZES                                                         */}
      {/* Only show quizzes that the agent has NOT submitted yet.                   */}
      {/* After submission, the quiz is REMOVED from this section!                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500 text-[22px]">quiz</span>
            <h2 className="text-lg font-bold text-slate-900">Pending Quizzes</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                pendingQuizzes.length > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {pendingQuizzes.length > 0
                ? `${pendingQuizzes.length} Action Required`
                : 'All Completed ✓'}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Single Attempt Only • No Retakes
          </span>
        </div>

        {pendingQuizzes.length > 0 ? (
          /* Horizontal grid of pending quizzes */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingQuizzes.map((proc) => (
              <div
                key={proc.id}
                className="p-5 rounded-3xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/20 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 uppercase tracking-wider">
                      {proc.category}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      Pending Quiz
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{proc.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {proc.shortDescription}
                  </p>

                  <div className="mt-3.5 p-2.5 rounded-2xl bg-white/90 border border-amber-200/60 text-[11px] text-slate-700 flex items-center justify-between font-semibold">
                    <span>{proc.quiz.questions.length} Questions</span>
                    <span>{proc.quiz.totalMarks} Marks</span>
                    <span className="text-amber-700 font-extrabold">80% Pass Bar</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-amber-100">
                  <button
                    onClick={() => onOpenProcess(proc)}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    <span>Start Quiz</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Celebratory banner when no pending quizzes */
          <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md flex-shrink-0">
                <span className="material-symbols-outlined text-[26px]">task_alt</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-emerald-950">
                  All Quizzes Completed! 🎉
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  You have submitted all assigned certification quizzes. Your official results are
                  recorded in the Scorecards section below.
                </p>
              </div>
            </div>

            <span className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-extrabold shadow-2xs">
              100% Up to Date
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. SCORECARDS: Only show quizzes that the agent HAS already submitted.     */}
      {/* Replaces the completed Quiz. Horizontal layout:                            */}
      {/* [ Process A | 9/10 | 90% | Completed | View Scorecard ]                   */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">badge</span>
            <h2 className="text-lg font-bold text-slate-900">
              Scorecards ({mySubmissions.length})
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              Certified Results
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Confidential to {currentAgent.name} • Final Locked Records
          </span>
        </div>

        {mySubmissions.length > 0 ? (
          /* Horizontal Cards/Rows: [ Process A | 9/10 | 90% | Completed | View Scorecard ] */
          <div className="space-y-3">
            {mySubmissions.map((sub) => {
              const proc = processes.find((p) => p.id === sub.processId);
              const qCount = sub.answersSummary?.total || proc?.quiz.questions.length || 0;
              const cCount =
                sub.answersSummary?.correct ??
                Math.round(((sub.percentage || 0) / 100) * qCount);

              return (
                <div
                  key={sub.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-white via-slate-50/60 to-emerald-50/20 hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Process Name & Details */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black flex-shrink-0 shadow-2xs">
                      <span className="material-symbols-outlined text-[20px]">verified</span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {sub.processTitle}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>Submitted {sub.submittedAt}</span>
                        <span>•</span>
                        <span>{sub.team}</span>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Score Metrics: Score (9/10), Percentage (90%), Status (Completed) */}
                  <div className="flex items-center gap-4 sm:gap-6 flex-wrap sm:flex-nowrap justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    {/* Score (e.g. 9/10 or 18/20) */}
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                        Score
                      </span>
                      <span className="text-sm font-black text-slate-800">
                        {cCount}/{qCount} ({sub.score}/{sub.totalMarks} pts)
                      </span>
                    </div>

                    {/* Percentage */}
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                        Percentage
                      </span>
                      <span
                        className={`text-base font-black ${
                          sub.percentage >= 80 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {sub.percentage}%
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                          sub.passed
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {sub.passed ? 'check_circle' : 'cancel'}
                        </span>
                        <span>{sub.passed ? 'Completed' : 'Failed'}</span>
                      </span>
                    </div>

                    {/* View Scorecard Button */}
                    <button
                      onClick={() => setSelectedScorecardSub(sub)}
                      className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/90 hover:bg-emerald-50 hover:border-emerald-300 text-emerald-800 text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      <span>View Scorecard</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <span className="material-symbols-outlined text-[32px] text-slate-300">
              assignment_late
            </span>
            <p className="text-xs font-bold text-slate-600 mt-2">No scorecards yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Complete your pending certification quizzes above to generate your scorecards.
            </p>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. QUIZ LEADERBOARD: Separate Per-Quiz Leaderboard for Agents             */}
      {/* Shows: Rank | Agent Name | Quiz Score | Percentage                        */}
      {/* ========================================================================= */}
      <QuizLeaderboard
        processes={processes}
        submissions={submissions}
        agents={allAgents}
        currentAgentId={currentAgent.id}
        isAdmin={false}
      />

      {/* ========================================================================= */}
      {/* 7. QUALITY SCORE LEADERBOARD: Separate Quality Score Rankings for Agents   */}
      {/* Shows: Rank | Agent Name | Quality Score (Zero private details shown)     */}
      {/* ========================================================================= */}
      <QualityScoreLeaderboard
        agents={allAgents}
        currentAgentId={currentAgent.id}
        isAdmin={false}
      />

      {/* ========================================================================= */}
      {/* SCORECARD MODAL POPUP                                                     */}
      {/* ========================================================================= */}
      {selectedScorecardSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <HorizontalScorecard
              submission={selectedScorecardSub}
              onClose={() => setSelectedScorecardSub(null)}
              showExpandDetails={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
