import React, { useState } from 'react';
import { AuditProcess } from '../types';

interface UpdatesViewProps {
  processes: AuditProcess[];
  userRole?: 'admin' | 'agent';
  completedProcessIds?: Set<string>;
  onSelectProcess: (process: AuditProcess) => void;
  onNewAudit: () => void;
  onOpenProcessDetail: (process: AuditProcess) => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  processes,
  userRole = 'admin',
  completedProcessIds = new Set(),
  onSelectProcess,
  onNewAudit,
  onOpenProcessDetail
}) => {
  const [filter, setFilter] = useState<'All' | 'Published' | 'Draft'>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    'All',
    'Support / Escalations',
    'Customer Success',
    'Billing & Compliance',
    'Call Quality'
  ];

  const filteredProcesses = processes.filter((p) => {
    if (filter !== 'All' && p.status !== filter) return false;
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.shortDescription.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-300">
      {/* Top Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Process Updates &amp; SOP Guidelines
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              {processes.length} Workflows
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Standard operating procedures, compliance matrices, and single-attempt certification
            quizzes.
          </p>
        </div>

        {userRole === 'admin' && (
          <button
            onClick={onNewAudit}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span>Create New Process</span>
          </button>
        )}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80 flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search processes by keyword, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 text-xs sm:text-sm text-slate-800 outline-none border border-slate-200 focus:border-indigo-500 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl">
            {(['All', 'Published', 'Draft'] as const).map((tab) => (
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
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Process Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProcesses.map((proc) => {
          const isCompleted = completedProcessIds.has(proc.id);
          const isDraft = proc.status === 'Draft';
          const rate = proc.metrics?.completionRate ?? 0;

          return (
            <div
              key={proc.id}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-indigo-500/50 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                    {proc.category}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {proc.priority === 'High' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Priority
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isDraft
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isCompleted ? 'Completed ✓' : proc.status}
                    </span>
                  </div>
                </div>

                {/* Title & Description */}
                <h3
                  onClick={() => onOpenProcessDetail(proc)}
                  className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1 cursor-pointer"
                >
                  {proc.title}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                  {proc.shortDescription}
                </p>

                {/* Question & Marks Indicator Pills */}
                <div className="mt-4 p-2.5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-indigo-600">quiz</span>
                    {proc.quiz.questions.length} Questions
                  </span>
                  <span className="font-semibold text-indigo-600">
                    {proc.quiz.totalMarks} Marks
                  </span>
                  <span className="text-slate-400 font-medium">{proc.effectiveDate}</span>
                </div>

                {/* Progress Bar & Completion Stats */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400 font-medium">
                      {isCompleted ? 'My Status: Certified' : 'Compliance Pass Standard'}
                    </span>
                    <span className="font-bold text-slate-800">
                      {isCompleted ? '100% Passed' : `${rate}% Team Certified`}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : rate >= 90
                          ? 'bg-emerald-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: isCompleted ? '100%' : `${rate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer: Direct link to Process Detail Page */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => onOpenProcessDetail(proc)}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-md hover:shadow-indigo-500/20 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isCompleted ? 'badge' : 'menu_book'}
                  </span>
                  <span>{isCompleted ? 'View Scorecard' : 'Read SOP & Quiz'}</span>
                </button>

                {userRole === 'admin' && (
                  <button
                    onClick={() => onSelectProcess(proc)}
                    className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    title="Edit Process Workflow"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
