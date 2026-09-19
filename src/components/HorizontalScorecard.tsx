import React, { useState } from 'react';
import { Submission } from '../types';

interface HorizontalScorecardProps {
  submission: Submission;
  onClose?: () => void;
  showExpandDetails?: boolean;
}

export const HorizontalScorecard: React.FC<HorizontalScorecardProps> = ({
  submission,
  onClose,
  showExpandDetails = true
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const passed = submission.passed;
  const correctCount = submission.answersSummary?.correct ?? Math.round((submission.percentage / 100) * (submission.answersSummary?.total || 5));
  const totalQuestions = submission.answersSummary?.total ?? 5;

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-indigo-950/5 overflow-hidden transition-all duration-300">
      {/* Top Banner Ribbon */}
      <div
        className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between text-white ${
          passed
            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700'
            : 'bg-gradient-to-r from-amber-600 via-rose-600 to-rose-700'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">
            {passed ? 'verified_user' : 'warning'}
          </span>
          <span className="uppercase tracking-wider">
            Official Certification Scorecard • {passed ? 'Passed & Recorded' : 'Requires Review'}
          </span>
        </div>
        <span className="opacity-90 font-medium">Recorded on {submission.submittedAt}</span>
      </div>

      {/* Main Horizontal Scorecard Body */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Col 1: Agent & Process Identity (4 Cols) */}
          <div className="lg:col-span-4 flex items-start gap-3.5 border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-6">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-md flex-shrink-0 ${
                submission.agentColor || 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white'
              }`}
            >
              {submission.agentInitial || submission.agentName.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {submission.team}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Agent Scorecard</span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 truncate mt-1">
                {submission.agentName}
              </h3>
              <p className="text-xs text-slate-500 font-medium line-clamp-1 mt-0.5">
                {submission.processTitle}
              </p>
            </div>
          </div>

          {/* Col 2: Horizontal Metrics Row (5 Cols) */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-3 border-b lg:border-b-0 lg:border-r border-slate-100 pb-5 lg:pb-0 lg:pr-6 text-center">
            {/* Final Percentage */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Final Grade
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-0.5">
                <span
                  className={`text-2xl font-black ${
                    passed ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {submission.percentage}%
                </span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                Passing bar: 80%
              </span>
            </div>

            {/* Earned Points */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Earned Points
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-black text-slate-800">{submission.score}</span>
                <span className="text-xs text-slate-400 font-bold">/{submission.totalMarks}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                Marks scored
              </span>
            </div>

            {/* Correct Answers */}
            <div className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Accuracy
              </span>
              <div className="mt-1 flex items-baseline justify-center gap-0.5">
                <span className="text-2xl font-black text-indigo-600">{correctCount}</span>
                <span className="text-xs text-slate-400 font-bold">/{totalQuestions}</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                Questions correct
              </span>
            </div>
          </div>

          {/* Col 3: Status Badge & Actions (3 Cols) */}
          <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col items-center lg:items-end justify-between gap-3">
            <div className="text-center lg:text-right">
              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black shadow-xs ${
                  passed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {passed ? 'check_circle' : 'cancel'}
                </span>
                {passed ? 'CERTIFIED PASS' : 'REVIEW NEEDED'}
              </span>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                {passed ? 'Audit compliance verified' : 'Below 80% passing standard'}
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {showExpandDetails && submission.answersDetail && submission.answersDetail.length > 0 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full sm:w-auto px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{isExpanded ? 'Hide Details' : 'View Question Breakdown'}</span>
                  <span className="material-symbols-outlined text-[16px]">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              )}

              {onClose && (
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Question Breakdown */}
        {isExpanded && submission.answersDetail && (
          <div className="mt-6 pt-5 border-t border-slate-100 animate-in fade-in duration-200">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-indigo-600">checklist</span>
              Question-by-Question Graded Breakdown
            </h4>

            <div className="space-y-2.5">
              {submission.answersDetail.map((detail, idx) => (
                <div
                  key={detail.questionId || idx}
                  className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    detail.isCorrect
                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                      : 'bg-rose-50/50 border-rose-200 text-rose-950'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5 ${
                        detail.isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-rose-600 text-white'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">{detail.questionText}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Selected Answer:{' '}
                        <strong
                          className={detail.isCorrect ? 'text-emerald-700' : 'text-rose-700'}
                        >
                          {detail.selectedOptionText}
                        </strong>
                        {!detail.isCorrect && (
                          <span className="text-slate-600 font-medium ml-2">
                            (Correct key: {detail.correctOptionText})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        detail.isCorrect
                          ? 'bg-emerald-200/70 text-emerald-800'
                          : 'bg-rose-200/70 text-rose-800'
                      }`}
                    >
                      {detail.pointsEarned}/{detail.pointsPossible} pts
                    </span>
                    <span className="material-symbols-outlined text-[18px]">
                      {detail.isCorrect ? 'check_circle' : 'cancel'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
