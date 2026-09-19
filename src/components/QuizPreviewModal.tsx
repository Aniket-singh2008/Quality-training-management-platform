import React, { useState } from 'react';
import { AuditProcess, Submission, Agent } from '../types';
import { HorizontalScorecard } from './HorizontalScorecard';

interface QuizPreviewModalProps {
  process: AuditProcess;
  currentAgent?: Agent;
  existingSubmission?: Submission;
  onClose: () => void;
  onQuizCompleted?: (
    scorePercent: number,
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
}

export const QuizPreviewModal: React.FC<QuizPreviewModalProps> = ({
  process,
  currentAgent,
  existingSubmission,
  onClose,
  onQuizCompleted
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(!!existingSubmission);
  const [reviewMode, setReviewMode] = useState(false);
  const [showScorecardView, setShowScorecardView] = useState(false);

  const questions = process.quiz.questions;
  const totalQuestions = questions.length;
  const currentQ = questions[currentQuestionIndex];

  const handleSelectOption = (optId: string) => {
    if (submitted && !reviewMode) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQ.id]: optId
    });
  };

  // Calculate scores
  let earnedMarks = 0;
  let correctCount = 0;
  const totalPossibleMarks = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const answersDetail = questions.map((q) => {
    const selectedOptId = selectedAnswers[q.id];
    const selectedOpt = q.options.find((opt) => opt.id === selectedOptId);
    const correctOpt = q.options.find((opt) => opt.isCorrect);
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
      selectedOptionText: selectedOpt ? selectedOpt.text : 'Not answered',
      correctOptionText: correctOpt ? correctOpt.text : '',
      isCorrect,
      pointsEarned: isCorrect ? pts : 0,
      pointsPossible: pts
    };
  });

  const percentage =
    existingSubmission?.percentage ??
    (totalPossibleMarks > 0 ? Math.round((earnedMarks / totalPossibleMarks) * 100) : 0);
  const passed = percentage >= 80;

  const handleSubmit = () => {
    setSubmitted(true);
    if (onQuizCompleted) {
      onQuizCompleted(percentage, earnedMarks, totalPossibleMarks, answersDetail);
    }
  };

  const currentSubmissionRecord: Submission = existingSubmission || {
    id: `sub-curr-${Date.now()}`,
    agentId: currentAgent?.id || 'ag-curr',
    agentName: currentAgent?.name || 'Agent',
    agentInitial: currentAgent?.initial || 'A',
    agentColor: currentAgent?.colorClass || 'bg-indigo-600 text-white',
    team: currentAgent?.team || 'Operations',
    processId: process.id,
    processTitle: process.title,
    score: earnedMarks,
    totalMarks: totalPossibleMarks,
    percentage,
    passed,
    submittedAt: 'Just now',
    answersSummary: { correct: correctCount, total: totalQuestions },
    answersDetail
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-white/20 text-white">
                Knowledge Check
              </span>
              <span className="text-xs text-indigo-100">{process.category}</span>
            </div>
            <h2 className="text-lg font-extrabold mt-1 text-white truncate max-w-md">
              {process.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {submitted && showScorecardView ? (
            /* SCORECARD VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">Official Process Scorecard</h3>
                <button
                  onClick={() => setShowScorecardView(false)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Back to Summary
                </button>
              </div>
              <HorizontalScorecard
                submission={currentSubmissionRecord}
                showExpandDetails={true}
              />
            </div>
          ) : submitted && !reviewMode ? (
            /* 1. QUIZ COMPLETED SUMMARY SCREEN (NO RETAKE PER REQUIREMENTS) */
            <div className="flex flex-col items-center text-center py-6 space-y-5">
              {/* Prominent Score Visual */}
              <div className="relative">
                <div
                  className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xl border-4 ${
                    passed
                      ? 'bg-gradient-to-br from-emerald-50 to-teal-100 border-emerald-500 text-emerald-800'
                      : 'bg-gradient-to-br from-amber-50 to-rose-100 border-rose-500 text-rose-800'
                  }`}
                >
                  <span className="text-3xl font-black">{percentage}%</span>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {passed ? 'Passed' : 'Completed'}
                  </span>
                </div>
                <div className="absolute -bottom-2 -right-1 text-2xl">
                  {passed ? '🏆' : '📋'}
                </div>
              </div>

              {/* Status & Feedback Heading */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-2">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Completed • Final Submission Recorded</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {passed ? 'Assessment Certified! 🎉' : 'Assessment Complete'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Your final score is recorded in the QA database. Per compliance guidelines, quiz
                  retakes are disabled.
                </p>
              </div>

              {/* Key Score Breakdown Cards */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Marks Earned
                  </span>
                  <p className="text-lg font-extrabold text-slate-800 mt-1">
                    {earnedMarks}/{totalPossibleMarks}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Correct Answers
                  </span>
                  <p className="text-lg font-extrabold text-emerald-600 mt-1">
                    {correctCount}/{totalQuestions}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Target Pass
                  </span>
                  <p className="text-lg font-extrabold text-indigo-600 mt-1">80%</p>
                </div>
              </div>

              {/* Action Buttons: Review Answers & View Scorecard (Retake Quiz REMOVED) */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4 w-full max-w-md">
                <button
                  onClick={() => setShowScorecardView(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  <span>View Scorecard</span>
                </button>

                <button
                  onClick={() => setReviewMode(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Review Answers
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            /* 2. ACTIVE QUIZ RUNNER / REVIEW MODE */
            <div className="space-y-6">
              {/* Notice that this is single attempt */}
              {!submitted && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">info</span>
                  <span>
                    Notice: This certification quiz allows only 1 attempt. Retakes are disabled.
                  </span>
                </div>
              )}

              {/* Progress bar & Question Counter */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <span>
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </span>
                  <span className="text-indigo-600">{currentQ.points} Marks</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                  Question Prompt
                </span>
                <p className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                  {currentQ.text}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((option) => {
                  const isSelected = selectedAnswers[currentQ.id] === option.id;
                  const isCorrect = option.isCorrect;

                  let optionStyles = 'border-slate-200 hover:border-indigo-400 bg-white';
                  if (reviewMode) {
                    if (isCorrect) {
                      optionStyles = 'border-emerald-500 bg-emerald-50/60 text-emerald-950 font-bold';
                    } else if (isSelected && !isCorrect) {
                      optionStyles = 'border-rose-500 bg-rose-50/60 text-rose-950 font-bold';
                    } else {
                      optionStyles = 'border-slate-200 opacity-60 bg-white';
                    }
                  } else if (isSelected) {
                    optionStyles =
                      'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-xs ring-1 ring-indigo-600';
                  }

                  return (
                    <div
                      key={option.id}
                      onClick={() => !reviewMode && handleSelectOption(option.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between text-xs sm:text-sm ${optionStyles}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected || (reviewMode && isCorrect)
                              ? reviewMode && isCorrect
                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                : 'border-indigo-600 bg-indigo-600 text-white'
                              : 'border-slate-300'
                          }`}
                        >
                          {(isSelected || (reviewMode && isCorrect)) && (
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <span>{option.text}</span>
                      </div>

                      {reviewMode && isCorrect && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                          Correct Answer
                        </span>
                      )}

                      {reviewMode && isSelected && !isCorrect && (
                        <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">cancel</span>
                          Your Answer
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Navigation buttons inside Quiz */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                  >
                    Next Question
                  </button>
                ) : reviewMode ? (
                  <button
                    onClick={() => setReviewMode(false)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
                  >
                    Back to Score Summary
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={Object.keys(selectedAnswers).length === 0}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    Submit Quiz (Single Attempt)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
