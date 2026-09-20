import React, { useState, useRef, useEffect } from 'react';
import { AuditProcess, Question, Option, Agent } from '../types';
import { fetchAgentsFromSupabase } from '../services/supabaseService';

interface NewAuditViewProps {
  initialProcess?: AuditProcess;
  allAgents: Agent[];
  onSaveDraft: (process: AuditProcess) => void;
  onPublish: (process: AuditProcess) => void;
  onPreview: (process: AuditProcess) => void;
  onBack: () => void;
}

export const NewAuditView: React.FC<NewAuditViewProps> = ({
  initialProcess,
  allAgents,
  onSaveDraft,
  onPublish,
  onPreview,
  onBack
}) => {
  // Step indicator state (1: Info, 2: Instructions, 3: Attachments, 4: Quiz & Marks, 5: Audience & Publish)
  const [activeStep, setActiveStep] = useState<number>(1);

  // Form state
  const [draftNumber] = useState(initialProcess?.draftNumber || 'Draft #PU-2024-09');
  const [lastSaved, setLastSaved] = useState(initialProcess?.autoSavedText || 'Auto-saved just now');
  const [title, setTitle] = useState(
    initialProcess?.title || 'Tier 2 Escalation & Incident Triage Protocol'
  );
  const [shortDescription, setShortDescription] = useState(
    initialProcess?.shortDescription ||
      'Guidelines for handling priority customer tickets and edge cases requiring manager override.'
  );
  const [category, setCategory] = useState(initialProcess?.category || 'Support / Escalations');
  const [effectiveDate, setEffectiveDate] = useState(initialProcess?.effectiveDate || 'Nov 01, 2024');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>(
    initialProcess?.priority || 'High'
  );

  // Content state
  const [sectionTitle, setSectionTitle] = useState(
    initialProcess?.content?.sectionTitle || 'Incident Classification Criteria'
  );
  const [bodyText, setBodyText] = useState(
    initialProcess?.content?.bodyText ||
      'When a customer reports payment discrepancy > $500, immediately flag the ticket under Severity-1 and trigger the direct tier-2 routing chain.'
  );
  const [complianceNotice, setComplianceNotice] = useState(
    initialProcess?.content?.complianceCallout ||
      'Mandatory Compliance: Ensure all customer identifiers are masked prior to initiating third-party audit verification.'
  );
  const [attachment, setAttachment] = useState<{ name: string; size: string } | null>(
    initialProcess?.content?.attachmentName
      ? {
          name: initialProcess.content.attachmentName,
          size: initialProcess.content.attachmentSize || '1.4 MB'
        }
      : {
          name: 'escalation_matrix_v2.pdf',
          size: '1.4 MB'
        }
  );

  // Quiz state
  const [questions, setQuestions] = useState<Question[]>(
    initialProcess?.quiz?.questions || [
      {
        id: 'q-1',
        text: 'What is the mandatory SLA response time for a Severity-1 payment escalation?',
        type: 'multiple-choice',
        points: 10,
        options: [
          { id: 'opt-1', text: '15 minutes', isCorrect: true },
          { id: 'opt-2', text: '30 minutes', isCorrect: false },
          { id: 'opt-3', text: '1 hour', isCorrect: false },
          { id: 'opt-4', text: '4 hours', isCorrect: false }
        ]
      },
      {
        id: 'q-2',
        text: 'Which step is mandatory before escalating payment discrepancies over $500 to third-party verification?',
        type: 'multiple-choice',
        points: 10,
        options: [
          { id: 'opt-2-1', text: 'Mask all personally identifiable information (PII)', isCorrect: true },
          { id: 'opt-2-2', text: 'Issue an immediate credit coupon', isCorrect: false },
          { id: 'opt-2-3', text: 'Forward unredacted account numbers directly', isCorrect: false }
        ]
      }
    ]
  );

  // Audience state
  const [agentsList, setAgentsList] = useState<Agent[]>(allAgents);
  const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(false);

  useEffect(() => {
    if (allAgents && allAgents.length > 0) {
      setAgentsList(allAgents);
    } else {
      setIsLoadingAgents(true);
      fetchAgentsFromSupabase().then((loaded) => {
        setIsLoadingAgents(false);
        if (loaded && loaded.length > 0) {
          setAgentsList(loaded);
        }
      });
    }
  }, [allAgents]);

  const activeAgents = agentsList.filter(
    (a) => a.status !== 'Inactive' && (a.role || '').toLowerCase() === 'agent'
  );

  const [audienceScope, setAudienceScope] = useState<'all' | 'selected'>(
    initialProcess?.audience?.type || 'all'
  );
  const [selectedTeams, setSelectedTeams] = useState<string[]>(
    initialProcess?.audience?.selectedTeams || ['Escalations Squad']
  );
  const [assignedAgentIds, setAssignedAgentIds] = useState<string[]>(
    initialProcess?.audience?.assignedAgents || []
  );

  useEffect(() => {
    if (activeAgents.length > 0) {
      if (initialProcess?.audience?.assignedAgents && initialProcess.audience.assignedAgents.length > 0) {
        setAssignedAgentIds(initialProcess.audience.assignedAgents);
      } else if (assignedAgentIds.length === 0) {
        setAssignedAgentIds(activeAgents.map((a) => a.id));
      }
    }
  }, [activeAgents.length, initialProcess]);

  const isAllSelected = activeAgents.length > 0 && assignedAgentIds.length === activeAgents.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setAssignedAgentIds([]);
      setAudienceScope('selected');
    } else {
      const allIds = activeAgents.map((a) => a.id);
      setAssignedAgentIds(allIds);
      setAudienceScope('all');
    }
  };

  const toggleAgentAssigned = (agentId: string) => {
    let next: string[];
    if (assignedAgentIds.includes(agentId)) {
      next = assignedAgentIds.filter((id) => id !== agentId);
    } else {
      next = [...assignedAgentIds, agentId];
    }
    setAssignedAgentIds(next);
    if (next.length === activeAgents.length && activeAgents.length > 0) {
      setAudienceScope('all');
    } else {
      setAudienceScope('selected');
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helpers
  const totalMarks = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  const buildCurrentProcess = (status: 'Published' | 'Draft'): AuditProcess => {
    const effectiveAssigned =
      audienceScope === 'all'
        ? activeAgents.map((a) => a.id)
        : assignedAgentIds;

    return {
      id: initialProcess?.id || `proc-${Date.now()}`,
      draftNumber,
      title,
      shortDescription,
      category,
      effectiveDate,
      priority,
      status,
      autoSavedText: 'Saved just now',
      content: {
        sectionTitle,
        bodyText,
        complianceCallout: complianceNotice,
        attachmentName: attachment?.name,
        attachmentSize: attachment?.size
      },
      quiz: {
        totalQuestions: questions.length,
        totalMarks,
        questions
      },
      audience: {
        type: audienceScope,
        selectedTeams,
        assignedAgents: effectiveAssigned,
        totalActive: activeAgents.length
      },
      metrics: {
        completionRate: initialProcess?.metrics?.completionRate || 0,
        completedCount: initialProcess?.metrics?.completedCount || 0,
        totalAssigned: effectiveAssigned.length,
        publishedDate: initialProcess?.metrics?.publishedDate || (status === 'Published' ? 'Today' : undefined)
      }
    };
  };

  const handleDraftClick = () => {
    const updated = buildCurrentProcess('Draft');
    setLastSaved('Saved just now');
    onSaveDraft(updated);
  };

  const handlePublishClick = () => {
    if (assignedAgentIds.length === 0) {
      alert('Please select at least one agent to receive this Process Update & Quiz.');
      return;
    }
    const updated = buildCurrentProcess('Published');
    onPublish(updated);
  };

  const handlePreviewClick = () => {
    const current = buildCurrentProcess('Draft');
    onPreview(current);
  };

  // Question manipulation
  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      text: '',
      type: 'multiple-choice',
      points: 10,
      options: [
        { id: `opt-${Date.now()}-1`, text: '', isCorrect: true },
        { id: `opt-${Date.now()}-2`, text: '', isCorrect: false }
      ]
    };
    setQuestions([...questions, newQ]);
  };

  const handleUpdateQuestion = (qId: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === qId ? { ...q, ...updates } : q)));
  };

  const handleDeleteQuestion = (qId: string) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((q) => q.id !== qId));
  };

  const handleAddOption = (qId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const newOpt: Option = {
            id: `opt-${Date.now()}-${q.options.length + 1}`,
            text: '',
            isCorrect: false
          };
          return { ...q, options: [...q.options, newOpt] };
        }
        return q;
      })
    );
  };

  const handleRemoveOption = (qId: string, optId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId && q.options.length > 2) {
          return { ...q, options: q.options.filter((opt) => opt.id !== optId) };
        }
        return q;
      })
    );
  };

  const handleSetCorrectOption = (qId: string, optId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            options: q.options.map((opt) => ({
              ...opt,
              isCorrect: opt.id === optId
            }))
          };
        }
        return q;
      })
    );
  };

  const handleOptionTextChange = (qId: string, optId: string, text: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          return {
            ...q,
            options: q.options.map((opt) => (opt.id === optId ? { ...opt, text } : opt))
          };
        }
        return q;
      })
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      });
    }
  };

  const steps = [
    { num: 1, label: 'Information', icon: 'info' },
    { num: 2, label: 'Instructions', icon: 'menu_book' },
    { num: 3, label: 'Attachments', icon: 'attach_file' },
    { num: 4, label: 'Quiz & Marks', icon: 'quiz' },
    { num: 5, label: 'Send To Agents', icon: 'groups' }
  ];

  return (
    <div className="flex flex-col w-full gap-6 max-w-5xl mx-auto pb-28 animate-in fade-in duration-300">
      {/* Top Bar: Title, Back, Auto-save status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {draftNumber}
              </span>
              <span className="text-xs text-slate-400">• {lastSaved}</span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handlePreviewClick}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-slate-500">visibility</span>
            <span>Test Quiz</span>
          </button>
          <button
            onClick={handleDraftClick}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors cursor-pointer"
          >
            Save Draft
          </button>
        </div>
      </div>

      {/* Step Progress Stepper */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between min-w-[560px]">
          {steps.map((s, idx) => {
            const isCompleted = activeStep > s.num;
            const isCurrent = activeStep === s.num;
            return (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => setActiveStep(s.num)}
                  className={`flex items-center gap-2 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : isCompleted
                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                      isCurrent
                        ? 'bg-white/20 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isCompleted ? '✓' : s.num}
                  </span>
                  <span className="text-xs font-bold whitespace-nowrap">{s.label}</span>
                </button>

                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                      activeStep > s.num ? 'bg-emerald-500' : 'bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* STEP 1: PROCESS INFORMATION */}
      {activeStep === 1 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              1. Process Overview &amp; Metadata
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Establish core identification, category classification, and operational priority.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Process Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Tier 2 Escalation & Incident Triage Protocol"
                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Short Description / Objective
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary of when and why this SOP is applied..."
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 focus:bg-white focus:border-indigo-600 outline-none transition-all resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition-all cursor-pointer"
              >
                <option value="Support / Escalations">Support / Escalations</option>
                <option value="Customer Success">Customer Success</option>
                <option value="Billing & Compliance">Billing & Compliance</option>
                <option value="Call Quality Guidelines">Call Quality Guidelines</option>
                <option value="Security & PII">Security & PII</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Effective Date
              </label>
              <input
                type="text"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                placeholder="e.g., Nov 01, 2024"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition-all"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Priority Tier
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['Low', 'Medium', 'High'] as const).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        isSelected
                          ? p === 'High'
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-sm'
                            : p === 'Medium'
                            ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm'
                            : 'bg-emerald-50 border-emerald-400 text-emerald-700 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          p === 'High'
                            ? 'bg-rose-500'
                            : p === 'Medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span>{p} Priority</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(2)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
            >
              <span>Next: Instructions</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: INSTRUCTIONS & CONTENT */}
      {activeStep === 2 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              2. SOP Content &amp; Instructions
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Specify the operational instructions, escalation triggers, and compliance alerts.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Section Title
              </label>
              <input
                type="text"
                value={sectionTitle}
                onChange={(e) => setSectionTitle(e.target.value)}
                placeholder="e.g., Incident Classification Criteria"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:border-indigo-600 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Step-by-Step Instructions (Body)
              </label>
              {/* Formatting mini-toolbar */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-t-2xl border-t border-x border-slate-200 text-slate-600">
                <button
                  type="button"
                  onClick={() => setBodyText((prev) => prev + ' **bold text**')}
                  className="p-1.5 rounded-lg hover:bg-white text-xs font-bold"
                  title="Bold"
                >
                  <span className="material-symbols-outlined text-[16px]">format_bold</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBodyText((prev) => prev + ' *italic text*')}
                  className="p-1.5 rounded-lg hover:bg-white text-xs font-bold"
                  title="Italic"
                >
                  <span className="material-symbols-outlined text-[16px]">format_italic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBodyText((prev) => prev + '\n- Bullet point')}
                  className="p-1.5 rounded-lg hover:bg-white text-xs font-bold"
                  title="Bullet list"
                >
                  <span className="material-symbols-outlined text-[16px]">format_list_bulleted</span>
                </button>
              </div>
              <textarea
                rows={5}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Detail the mandatory workflow, decision trees, and escalation criteria..."
                className="w-full p-4 rounded-b-2xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-indigo-600 outline-none transition-all resize-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Compliance &amp; Risk Callout
              </label>
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
                <span className="material-symbols-outlined text-amber-600 text-[22px] flex-shrink-0 mt-0.5">
                  warning
                </span>
                <div className="w-full">
                  <input
                    type="text"
                    value={complianceNotice}
                    onChange={(e) => setComplianceNotice(e.target.value)}
                    placeholder="Mandatory regulatory or security clause..."
                    className="w-full bg-transparent text-xs sm:text-sm font-medium text-amber-900 outline-none placeholder:text-amber-600/60"
                  />
                  <p className="text-[10px] text-amber-700 mt-1">
                    This notice will be highlighted in bright amber for agents prior to taking the quiz.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(3)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
            >
              <span>Next: Attachments</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ATTACHMENTS */}
      {activeStep === 3 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              3. Reference Documents &amp; Attachments
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Upload PDF reference matrices, flowcharts, or official customer policy docs.
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg"
          />

          {attachment ? (
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">description</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{attachment.name}</p>
                  <p className="text-xs text-slate-500">{attachment.size} • PDF Document</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-white text-indigo-600 border border-indigo-200 text-xs font-bold hover:bg-indigo-50 cursor-pointer"
                >
                  Replace
                </button>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-8 text-center bg-slate-50 hover:bg-indigo-50/30 transition-all cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-[28px]">cloud_upload</span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                Click to browse or drag and drop reference documents
              </p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOCX, PNG up to 10MB</p>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(4)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
            >
              <span>Next: Quiz &amp; Marks</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: QUIZ QUESTIONS, CORRECT ANSWERS & MARKS */}
      {activeStep === 4 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                4. Knowledge Check &amp; Point Rubric
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure multiple choice questions, tag the correct answers, and set marks per question.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                Total Marks: {totalMarks}
              </span>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:shadow-indigo-500/20 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Question</span>
              </button>
            </div>
          </div>

          {/* Question Cards List */}
          <div className="space-y-5">
            {questions.map((q, qIndex) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-4"
              >
                {/* Question Header & Points Input */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                      Q{qIndex + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-700">Question Item</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500">Marks:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={q.points}
                        onChange={(e) =>
                          handleUpdateQuestion(q.id, { points: parseInt(e.target.value) || 0 })
                        }
                        className="w-10 text-xs font-bold text-indigo-600 text-center outline-none bg-transparent"
                      />
                    </div>

                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Delete Question"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Text Input */}
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => handleUpdateQuestion(q.id, { text: e.target.value })}
                  placeholder={`Enter question statement #${qIndex + 1}...`}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 focus:border-indigo-600 outline-none transition-all"
                />

                {/* Answer Options with Correct Answer tag */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Options &amp; Correct Answer</span>
                    <span className="text-indigo-600">Select the radio button for the correct key</span>
                  </div>

                  {q.options.map((opt, optIndex) => (
                    <div
                      key={opt.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                        opt.isCorrect
                          ? 'bg-emerald-50/70 border-emerald-300'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSetCorrectOption(q.id, opt.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                          opt.isCorrect
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-300 hover:border-indigo-500'
                        }`}
                        title="Mark as correct answer"
                      >
                        {opt.isCorrect && (
                          <span className="material-symbols-outlined text-[12px]">check</span>
                        )}
                      </button>

                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleOptionTextChange(q.id, opt.id, e.target.value)}
                        placeholder={`Option ${optIndex + 1}...`}
                        className="flex-1 bg-transparent text-xs font-medium text-slate-800 outline-none"
                      />

                      {opt.isCorrect && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-600 text-white">
                          Correct Answer
                        </span>
                      )}

                      {q.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(q.id, opt.id)}
                          className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => handleAddOption(q.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>Add Answer Option</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(3)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStep(5)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
            >
              <span>Next: Send To Agents</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SEND TO AGENTS & PUBLISH */}
      {activeStep === 5 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              5. Send To Agents &amp; Rollout Review
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select which active agents from Supabase will receive this Process Update and must complete the certification quiz.
            </p>
          </div>

          {/* Section: Send To Agents */}
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 pb-3.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-indigo-600">group_add</span>
                    Send To Agents
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose individual agents, multiple agents, or select all active agents.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                    {assignedAgentIds.length} of {activeAgents.length} Agents Selected
                  </span>
                </div>
              </div>

              {/* Master "Select All Agents" Checkbox */}
              <div
                onClick={toggleSelectAll}
                className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                  isAllSelected
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="select-all-agents-checkbox"
                    checked={isAllSelected}
                    onChange={() => {}} // Handled by container onClick
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                  />
                  <div>
                    <label htmlFor="select-all-agents-checkbox" className="text-xs font-bold cursor-pointer block text-slate-900">
                      Select All Agents ({activeAgents.length} Total Active)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Assign this Process Update &amp; Quiz to every active agent loaded from Supabase
                    </span>
                  </div>
                </div>

                <span className="text-xs font-semibold text-indigo-600 hidden sm:inline">
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </span>
              </div>

              {/* Loading State */}
              {isLoadingAgents && (
                <div className="py-6 text-center text-slate-500 text-xs bg-white rounded-xl border border-slate-200">
                  <span className="material-symbols-outlined animate-spin text-xl text-indigo-600 mb-1">sync</span>
                  <p>Loading active agents from Supabase...</p>
                </div>
              )}

              {/* Empty State */}
              {!isLoadingAgents && activeAgents.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs bg-white rounded-xl border border-dashed border-slate-200">
                  <span className="material-symbols-outlined text-2xl text-slate-400 mb-1">person_off</span>
                  <p className="font-semibold text-slate-700">No active agents found in Supabase</p>
                  <p className="text-slate-400 mt-0.5">Please create agents in the Agents tab first.</p>
                </div>
              )}

              {/* Agent Roster with Checkboxes, Full Name, and Email */}
              {!isLoadingAgents && activeAgents.length > 0 && (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {activeAgents.map((agent) => {
                    const isChecked = assignedAgentIds.includes(agent.id);
                    return (
                      <div
                        key={agent.id}
                        onClick={() => toggleAgentAssigned(agent.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isChecked
                            ? 'border-indigo-500/80 bg-indigo-50/40 shadow-xs'
                            : 'border-slate-200/80 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            id={`agent-check-${agent.id}`}
                            checked={isChecked}
                            onChange={() => {}} // Handled by container onClick
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
                          />

                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              agent.colorClass || 'bg-indigo-600 text-white'
                            }`}
                          >
                            {agent.initial || agent.name.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {agent.name}
                              </span>
                              {agent.team && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 truncate hidden sm:inline">
                                  {agent.team}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate font-mono">
                              {agent.email}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isChecked
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isChecked ? 'Assigned ✓' : 'Unassigned'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Validation Notice if 0 selected */}
            {assignedAgentIds.length === 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
                <span className="font-medium">
                  Please select at least one agent to receive this Process Update &amp; Quiz before publishing.
                </span>
              </div>
            )}

            {/* Rollout Summary */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-indigo-100 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                Rollout Summary
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publishing <strong>"{title}"</strong> with{' '}
                <strong>
                  {questions.length} question{questions.length === 1 ? '' : 's'} ({totalMarks} marks)
                </strong>{' '}
                targeted to{' '}
                <strong className="text-indigo-700">
                  {assignedAgentIds.length} of {activeAgents.length} agent{assignedAgentIds.length === 1 ? '' : 's'}
                </strong>
                . Only the selected agents will receive compliance notifications and be able to view and complete this assessment.
              </p>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveStep(4)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
            >
              Back
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDraftClick}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                onClick={handlePublishClick}
                disabled={assignedAgentIds.length === 0}
                className={`px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all ${
                  assignedAgentIds.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">send</span>
                <span>
                  Publish ({assignedAgentIds.length} Agent{assignedAgentIds.length === 1 ? '' : 's'})
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
