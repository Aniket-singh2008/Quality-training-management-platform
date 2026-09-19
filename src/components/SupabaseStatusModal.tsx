import React, { useState } from 'react';
import { SupabaseHealthStatus, seedInitialDataIfEmpty } from '../services/supabaseService';
import { SUPABASE_CONFIG } from '../lib/supabase';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SupabaseHealthStatus | null;
  isLoading: boolean;
  onRefreshHealth: () => Promise<void>;
  onDataSyncSuccess?: () => void;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({
  isOpen,
  onClose,
  status,
  isLoading,
  onRefreshHealth,
  onDataSyncSuccess,
}) => {
  const [copied, setCopied] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const sqlSchema = `-- ProcessHub Supabase Database Schema
-- Run this in: Supabase Dashboard -> Project xxqdxzqdtrqzfoyvpenv -> SQL Editor -> New Query -> Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.process_updates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    short_description TEXT,
    category TEXT NOT NULL DEFAULT 'Operations',
    effective_date TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT NOT NULL DEFAULT 'Published',
    content JSONB DEFAULT '{}'::jsonb,
    quiz_meta JSONB DEFAULT '{}'::jsonb,
    audience JSONB DEFAULT '{}'::jsonb,
    metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL REFERENCES public.process_updates(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'multiple-choice',
    points NUMERIC NOT NULL DEFAULT 10,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agents (
    id TEXT PRIMARY KEY,
    agent_code TEXT,
    name TEXT NOT NULL,
    initial TEXT,
    color_class TEXT,
    team TEXT DEFAULT 'Support Tier 1',
    role TEXT DEFAULT 'Customer Experience Specialist',
    email TEXT,
    score NUMERIC DEFAULT 85,
    quality_score NUMERIC DEFAULT 85,
    fatal_count INTEGER DEFAULT 0,
    call_audit_count INTEGER DEFAULT 1,
    pending_quizzes INTEGER DEFAULT 0,
    completed_processes INTEGER DEFAULT 0,
    rank INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.scores (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL REFERENCES public.process_updates(id) ON DELETE CASCADE,
    process_title TEXT,
    agent_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    agent_initial TEXT,
    agent_color TEXT,
    team TEXT,
    score NUMERIC NOT NULL DEFAULT 0,
    total_marks NUMERIC NOT NULL DEFAULT 100,
    percentage NUMERIC NOT NULL DEFAULT 0,
    passed BOOLEAN NOT NULL DEFAULT TRUE,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    answers_summary JSONB DEFAULT '{}'::jsonb,
    answers_detail JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.user_responses (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES public.scores(id) ON DELETE CASCADE,
    process_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    points_awarded NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.process_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public select process_updates" ON public.process_updates;
    CREATE POLICY "Public select process_updates" ON public.process_updates FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert process_updates" ON public.process_updates;
    CREATE POLICY "Public insert process_updates" ON public.process_updates FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update process_updates" ON public.process_updates;
    CREATE POLICY "Public update process_updates" ON public.process_updates FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete process_updates" ON public.process_updates;
    CREATE POLICY "Public delete process_updates" ON public.process_updates FOR DELETE USING (true);

    DROP POLICY IF EXISTS "Public select questions" ON public.questions;
    CREATE POLICY "Public select questions" ON public.questions FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert questions" ON public.questions;
    CREATE POLICY "Public insert questions" ON public.questions FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update questions" ON public.questions;
    CREATE POLICY "Public update questions" ON public.questions FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete questions" ON public.questions;
    CREATE POLICY "Public delete questions" ON public.questions FOR DELETE USING (true);

    DROP POLICY IF EXISTS "Public select agents" ON public.agents;
    CREATE POLICY "Public select agents" ON public.agents FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert agents" ON public.agents;
    CREATE POLICY "Public insert agents" ON public.agents FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update agents" ON public.agents;
    CREATE POLICY "Public update agents" ON public.agents FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete agents" ON public.agents;
    CREATE POLICY "Public delete agents" ON public.agents FOR DELETE USING (true);

    DROP POLICY IF EXISTS "Public select scores" ON public.scores;
    CREATE POLICY "Public select scores" ON public.scores FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert scores" ON public.scores;
    CREATE POLICY "Public insert scores" ON public.scores FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update scores" ON public.scores;
    CREATE POLICY "Public update scores" ON public.scores FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete scores" ON public.scores;
    CREATE POLICY "Public delete scores" ON public.scores FOR DELETE USING (true);

    DROP POLICY IF EXISTS "Public select user_responses" ON public.user_responses;
    CREATE POLICY "Public select user_responses" ON public.user_responses FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert user_responses" ON public.user_responses;
    CREATE POLICY "Public insert user_responses" ON public.user_responses FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update user_responses" ON public.user_responses;
    CREATE POLICY "Public update user_responses" ON public.user_responses FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete user_responses" ON public.user_responses;
    CREATE POLICY "Public delete user_responses" ON public.user_responses FOR DELETE USING (true);
END $$;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const success = await seedInitialDataIfEmpty();
      if (success) {
        setSeedMessage('Successfully seeded initial data to Supabase!');
        if (onDataSyncSuccess) onDataSyncSuccess();
      } else {
        setSeedMessage('Tables already contain records, or tables not created yet.');
      }
    } catch (err: any) {
      setSeedMessage(`Error: ${err?.message || 'Failed to seed'}`);
    } finally {
      setSeeding(false);
    }
  };

  const tableList = [
    { key: 'process_updates', label: '1. Process Updates', desc: 'SOPs, categories & metrics' },
    { key: 'questions', label: '2. Questions', desc: 'Certification quiz rubrics & options' },
    { key: 'agents', label: '3. Agents / Users', desc: 'Roster, quality scores & auditees' },
    { key: 'scores', label: '4. Scores', desc: 'Graded quiz submissions & certifications' },
    { key: 'user_responses', label: '5. User Responses', desc: 'Individual question audit trails' },
  ] as const;

  const allTablesActive = status?.tablesExist ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[24px]">database</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg tracking-tight">Supabase Backend Status</h3>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                    allTablesActive
                      ? 'bg-emerald-400/30 text-emerald-100 border border-emerald-300/40'
                      : 'bg-amber-400/30 text-amber-100 border border-amber-300/40'
                  }`}
                >
                  {allTablesActive ? '● Live & Connected' : '● Setup Required'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Project ID: <code className="font-mono bg-white/15 px-1.5 py-0.5 rounded">{SUPABASE_CONFIG.projectId}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Connection Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Project REST URL</span>
              <span className="font-mono text-slate-700 font-semibold truncate block mt-0.5" title={SUPABASE_CONFIG.url}>
                {SUPABASE_CONFIG.url}
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 font-medium block">Published API Key</span>
              <span className="font-mono text-slate-700 font-semibold block mt-0.5">
                {SUPABASE_CONFIG.keyPreview}
              </span>
            </div>
          </div>

          {/* Database Tables Verification */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Required Database Tables (5 / 5)
              </h4>
              <button
                onClick={onRefreshHealth}
                disabled={isLoading}
                className="text-xs text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[15px] ${isLoading ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span>Verify Connection</span>
              </button>
            </div>

            <div className="space-y-2">
              {tableList.map((tbl) => {
                const isReady = status?.tableStatuses[tbl.key] ?? false;
                return (
                  <div
                    key={tbl.key}
                    className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                      isReady
                        ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          isReady ? 'text-emerald-600' : 'text-slate-400'
                        }`}
                      >
                        {isReady ? 'check_circle' : 'pending'}
                      </span>
                      <div>
                        <span className="font-bold text-xs">{tbl.label}</span>
                        <span className="text-[11px] text-slate-500 block">{tbl.desc}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isReady
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isReady ? 'Active' : 'Table Missing'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* If tables are NOT created yet, provide the SQL Schema Copy & Instructions */}
          {!allTablesActive && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-[22px] mt-0.5">
                  info
                </span>
                <div>
                  <h5 className="text-xs font-bold text-amber-900">
                    Tables Need to be Initialized in Supabase
                  </h5>
                  <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                    The Supabase project URL and API key are verified and connected. To enable full cloud persistence, copy the SQL schema below and run it once in your Supabase SQL Editor.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Copied SQL Script!' : 'Copy SQL Schema'}</span>
                </button>

                <a
                  href={`https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql/new`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <span>Open Supabase SQL Editor</span>
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>

                <button
                  onClick={onRefreshHealth}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all ml-auto flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                  <span>Check Again</span>
                </button>
              </div>
            </div>
          )}

          {/* If tables are active */}
          {allTablesActive && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-600 text-[22px]">
                  verified
                </span>
                <div>
                  <h5 className="text-xs font-bold text-emerald-900">
                    Supabase Database Fully Connected
                  </h5>
                  <p className="text-[11px] text-emerald-700">
                    All reads and writes for processes, questions, user responses, and scores are syncing directly with Supabase.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSeedData}
                disabled={seeding}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {seeding ? 'hourglass_top' : 'cloud_sync'}
                </span>
                <span>{seeding ? 'Syncing...' : 'Sync Initial Data'}</span>
              </button>
            </div>
          )}

          {seedMessage && (
            <p className="text-xs font-semibold text-center text-slate-600">{seedMessage}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Last checked: {status?.checkedAt || 'Just now'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
