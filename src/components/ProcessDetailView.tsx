import React, { useState } from 'react';
import { AuditProcess, Agent, Submission } from '../types';
import { HorizontalScorecard } from './HorizontalScorecard';

interface ProcessDetailViewProps {
  process: AuditProcess;
  currentAgent: Agent;
  userRole: 'admin' | 'agent';
  allAgents?: Agent[];
  allSubmissions?: Submission[];
  existingSubmission?: Submission;
  onBack: () => void;
  onSubmitQuiz: (
    process: AuditProcess,
    percentage: number,
    earnedMarks: number,
    totalMarks: number,
    answersDetail: Array<{
      questionId: string;
      questionText: string;
      selectedOptionId: string;
      selectedOptionText: string;
      correctOptionText: string;
      isCorrect: boolean;
      pointsEarned: number;
      pointsPossible: number;
    }>
  ) => void;
  onSelectEdit?: (process: AuditProcess) => void;
  onRemindAgent?: (agentId: string, processTitle: string) => void;
}

export const ProcessDetailView: React.FC<ProcessDetailViewProps> = ({
  process,
  currentAgent,
  userRole,
  allAgents = [],
  allSubmissions = [],
  existingSubmission,
  onBack,
  onSubmitQuiz,
  onSelectEdit,
  onRemindAgent
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submittedLocal, setSubmittedLocal] = useState(false);
  const [showScorecardModal, setShowScorecardModal] = useState(false);
  const [viewingAgentScorecard, setViewingAgentScorecard] = useState<Submission | null>(null);
  const [remindedAgentIds, setRemindedAgentIds] = useState<Set<string>>(new Set());

  if (!process) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto my-12">
        <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">assignment_late</span>
        <h3 className="text-base font-bold text-slate-800 mb-1">No process update found</h3>
        <p className="text-sm text-slate-500 mb-4">Please select a process from the updates page.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          Back to Updates
        </button>
      </div>
    );
  }

  // Check if agent is assigned
  const isAssigned =
    userRole === 'admin' ||
    !process.audience ||
    process.audience.type === 'all' ||
    (Array.isArray(process.audience.assignedAgents) &&
      process.audience.assignedAgents.includes(currentAgent?.id || ''));

  if (userRole === 'agent' && !isAssigned) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-sm max-w-xl mx-auto my-12 space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Process Update Not Assigned</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          This Process Update and certification assessment is targeted to specific team members and is not assigned to your profile.
        </p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
        >
          Back to My Dashboard
        </button>
      </div>
    );
  }

  // Admin roster data
  const activeAgentsList = allAgents.filter(
    (a) => a.status !== 'Inactive' && (a.role || '').toLowerCase() === 'agent'
  );
  const targetAgents = activeAgentsList.filter((a) => {
    if (!process.audience || process.audience.type === 'all') return true;
    return (
      Array.isArray(process.audience.assignedAgents) &&
      process.audience.assignedAgents.includes(a.id)
    );
  });

  const processSubmissions = allSubmissions.filter((s) => s.processId === process.id);
  const submissionsByAgentId = new Map(processSubmissions.map((s) => [s.agentId, s]));

  const completedCount = targetAgents.filter((a) => submissionsByAgentId.has(a.id)).length;
  const pendingCount = targetAgents.length - completedCount;
  const completionRate =
    targetAgents.length > 0 ? Math.round((completedCount / targetAgents.length) * 100) : 0;

  const handleRemindClick = (agent: Agent) => {
    setRemindedAgentIds((prev) => new Set([...prev, agent.id]));
    if (onRemindAgent) {
      onRemindAgent(agent.id, process.title);
    }
  };

  const isCompleted = !!existingSubmission || submittedLocal;
  const questions = process.quiz?.questions || [];
  const totalQuestions = questions.length;
  const totalPossibleMarks = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isCompleted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId
    }));
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  const handleSubmit = () => {
    if (isCompleted || answeredCount === 0) return;

    let earnedMarks = 0;
    let correctCount = 0;

    const answersDetail = questions.map((q) => {
      const selectedOptId = selectedAnswers[q.id];
      const selectedOpt = q.options.find((o) => o.id === selectedOptId);
      const correctOpt = q.options.find((o) => o.isCorrect);
      const isCorrect = correctOpt ? selectedOptId === correctOpt.id : false;
      const pts = Number(q.points) || 0;

      if (isCorrect) {
        earnedMarks += pts;
        correctCount += 1;
      }

      return {
        questionId: q.id,
        questionText: q.text,
        selectedOptionId: selectedOptId || '',
        selectedOptionText: selectedOpt ? selectedOpt.text : 'Unanswered',
        correctOptionText: correctOpt ? correctOpt.text : '',
        isCorrect,
        pointsEarned: isCorrect ? pts : 0,
        pointsPossible: pts
      };
    });

    const percentage =
      totalPossibleMarks > 0 ? Math.round((earnedMarks / totalPossibleMarks) * 100) : 0;

    setSubmittedLocal(true);
    onSubmitQuiz(process, percentage, earnedMarks, totalPossibleMarks, answersDetail);
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-5xl mx-auto pb-24 animate-in fade-in duration-300">
      {/* 1. TOP NAVIGATION & HEADER */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Process Updates</span>
        </button>

        <div className="flex items-center gap-2">
          {userRole === 'admin' && onSelectEdit && (
            <button
              onClick={() => onSelectEdit(process)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Edit SOP</span>
            </button>
          )}

          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              process.status === 'Published'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {process.status}
          </span>
        </div>
      </div>

      {/* 2. HERO TITLE CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
            {process.category}
          </span>
          {process.priority === 'High' && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
              High Priority Compliance
            </span>
          )}
          <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">group</span>
            <span>
              Target:{' '}
              {!process.audience || process.audience.type === 'all'
                ? `All Active Agents (${targetAgents.length})`
                : `${targetAgents.length} Selected Agent${targetAgents.length === 1 ? '' : 's'}`}
            </span>
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Effective Date: {process.effectiveDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {process.title}
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-3xl">
          {process.shortDescription}
        </p>

        {/* Status Tracker Pill */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-indigo-600">menu_book</span>
              Step 1: Read SOP Guidelines
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-purple-600">quiz</span>
              Step 2: Knowledge Check
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-emerald-600">badge</span>
              Step 3: Scorecard &amp; Certification
            </span>
          </div>

          {isCompleted ? (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Completed ✓
              </span>
              <span className="text-xs font-bold text-slate-500">
                Score: {existingSubmission?.percentage ?? 100}%
              </span>
            </div>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
              Quiz Pending • Single Attempt Allowed
            </span>
          )}
        </div>
      </div>

      {/* ADMIN ONLY: TARGET AGENTS & COMPLETION ROSTER */}
      {userRole === 'admin' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">assignment_ind</span>
                Agent Assignments &amp; Completion Status
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time tracking of agents who received this Process Update and their quiz certification progress.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {targetAgents.length} Targeted Agents
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Targeted</span>
              <span className="text-xl font-black text-slate-900 mt-1 block">{targetAgents.length}</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <span className="text-[11px] font-semibold text-emerald-700 block">Completed Quiz</span>
              <span className="text-xl font-black text-emerald-900 mt-1 block">{completedCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <span className="text-[11px] font-semibold text-amber-700 block">Pending Quiz</span>
              <span className="text-xl font-black text-amber-900 mt-1 block">{pendingCount}</span>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
              <span className="text-[11px] font-semibold text-indigo-700 block">Completion Rate</span>
              <span className="text-xl font-black text-indigo-950 mt-1 block">{completionRate}%</span>
            </div>
          </div>

          {/* Agent Roster Table */}
          <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/80 grid grid-cols-12 text-xs font-bold text-slate-600">
              <span className="col-span-5 sm:col-span-4">Agent Name &amp; Email</span>
              <span className="col-span-3 hidden sm:block">Role / Squad</span>
              <span className="col-span-4 sm:col-span-3">Quiz Status</span>
              <span className="col-span-3 sm:col-span-2 text-right">Action</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
              {targetAgents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No active agents currently assigned to this process update.
                </div>
              ) : (
                targetAgents.map((agent) => {
                  const sub = submissionsByAgentId.get(agent.id);
                  const isSubmitted = !!sub;
                  const isReminded = remindedAgentIds.has(agent.id);

                  return (
                    <div
                      key={agent.id}
                      className="px-4 py-3.5 grid grid-cols-12 items-center text-xs hover:bg-slate-50/80 transition-colors"
                    >
                      <div className="col-span-5 sm:col-span-4 flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            agent.colorClass || 'bg-indigo-600 text-white'
                          }`}
                        >
                          {agent.initial || agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{agent.name}</p>
                          <p className="text-[11px] text-slate-500 truncate font-mono">{agent.email}</p>
                        </div>
                      </div>

                      <div className="col-span-3 hidden sm:block">
                        <span className="text-slate-600 font-medium">
                          {agent.team || 'Customer Support'}
                        </span>
                      </div>

                      <div className="col-span-4 sm:col-span-3">
                        {isSubmitted ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <span className="material-symbols-outlined text-[15px]">check_circle</span>
                              Completed ({sub.percentage}%)
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {sub.earnedMarks ?? sub.score}/{sub.totalPossibleMarks ?? sub.totalMarks} Marks
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending Submission
                          </span>
                        )}
                      </div>

                      <div className="col-span-3 sm:col-span-2 text-right">
                        {isSubmitted ? (
                          <button
                            onClick={() => setViewingAgentScorecard(sub)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            Scorecard
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRemindClick(agent)}
                            disabled={isReminded}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                              isReminded
                                ? 'bg-slate-100 text-slate-400 cursor-default'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-800'
                            }`}
                          >
                            {isReminded ? 'Reminded ✓' : 'Remind'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. SECTION 1: SOP DOCUMENTATION CONTENT */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shadow-xs">
            01
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Standard Operating Procedure (SOP)
            </h2>
            <p className="text-xs text-slate-500">
              Mandatory procedural guidelines, compliance rules, and operational workflow.
            </p>
          </div>
        </div>

        {/* Section Title & Main Guidelines Body */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/60">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              {process.content?.sectionTitle || 'Operational Procedure'}
            </h3>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed font-normal">
              {process.content?.bodyText ||
                'Ensure all operational checkpoints are thoroughly reviewed. Escalations must be documented within the CRM and routed according to SLA requirements.'}
            </p>
          </div>

          {/* Compliance Callout Banner */}
          {process.content?.complianceCallout && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-rose-500/10 border border-amber-300/80 flex items-start gap-3.5">
              <span className="material-symbols-outlined text-[24px] text-amber-600 flex-shrink-0 mt-0.5">
                policy
              </span>
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Mandatory QA Compliance Requirement
                </h4>
                <p className="text-xs text-amber-950 font-medium mt-1 leading-relaxed">
                  {process.content.complianceCallout}
                </p>
              </div>
            </div>
          )}

          {/* SOP Attachment Pill */}
          {process.content?.attachmentName && (
            <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">description</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {process.content.attachmentName}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {process.content.attachmentSize || 'Official Matrix'}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>Reference Document</span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 4. SECTION 2: KNOWLEDGE CHECK (QUIZ) & SCORECARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black text-sm shadow-xs">
              02
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Knowledge Check &amp; Certification
              </h2>
              <p className="text-xs text-slate-500">
                {totalQuestions} Questions • {process.quiz.totalMarks} Total Marks • 80% Passing
                Threshold
              </p>
            </div>
          </div>

          {isCompleted && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Submission Finalized • Retakes Disabled</span>
            </span>
          )}
        </div>

        {/* IF COMPLETED: DISPLAY HORIZONTAL SCORECARD */}
        {isCompleted ? (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-emerald-950">
                    Process Audit Completed!
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Your answers were submitted and recorded. Retakes are permanently disabled for
                    audit integrity.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowScorecardModal(true)}
                className="px-4 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">badge</span>
                <span>View Full Scorecard</span>
              </button>
            </div>

            {/* Embed Horizontal Scorecard */}
            {existingSubmission && (
              <HorizontalScorecard submission={existingSubmission} showExpandDetails={true} />
            )}
          </div>
        ) : (
          /* IF NOT COMPLETED: INTERACTIVE QUIZ FORM (SINGLE ATTEMPT) */
          <div className="space-y-6">
            {/* Notice banner about no retakes */}
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3">
              <span className="material-symbols-outlined text-[20px] text-amber-600 flex-shrink-0 mt-0.5">
                info
              </span>
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Important Compliance Policy:</strong> You have 1 attempt to complete this
                certification quiz. Once submitted, answers are final and cannot be retaken.
              </p>
            </div>

            {/* Questions List */}
            <div className="space-y-6">
              {questions.map((q, qIndex) => {
                const isAnswered = !!selectedAnswers[q.id];
                return (
                  <div
                    key={q.id}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <span className="w-7 h-7 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                          {qIndex + 1}
                        </span>
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-slate-900">
                            {q.text}
                          </h4>
                          <span className="text-[11px] text-purple-600 font-semibold">
                            {q.points} Marks • Multiple Choice
                          </span>
                        </div>
                      </div>

                      {isAnswered && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex-shrink-0">
                          Answered ✓
                        </span>
                      )}
                    </div>

                    {/* Options list */}
                    <div className="space-y-2.5 pt-1">
                      {q.options.map((opt) => {
                        const isSelected = selectedAnswers[q.id] === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleSelectOption(q.id, opt.id)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between text-xs sm:text-sm ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50/80 text-purple-950 font-semibold shadow-xs ring-1 ring-purple-600'
                                : 'border-slate-200/80 hover:border-purple-300 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                    ? 'border-purple-600 bg-purple-600 text-white'
                                    : 'border-slate-300'
                                }`}
                              >
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span>{opt.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit Once Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                <span>
                  {answeredCount} of {totalQuestions} Questions Answered
                </span>
                {answeredCount < totalQuestions && (
                  <span className="text-amber-600 font-semibold ml-2">
                    ({totalQuestions - answeredCount} remaining)
                  </span>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={answeredCount === 0}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                <span>Submit Quiz (Single Attempt)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scorecard Modal View if triggered */}
      {showScorecardModal && existingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl">
            <HorizontalScorecard
              submission={existingSubmission}
              onClose={() => setShowScorecardModal(false)}
              showExpandDetails={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};
