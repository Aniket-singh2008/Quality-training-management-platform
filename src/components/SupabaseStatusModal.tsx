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
  const [activeTab, setActiveTab] = useState<'overview' | 'rls' | 'full-sql'>('rls');
  const [copiedType, setCopiedType] = useState<'all' | 'rls' | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const rlsPoliciesSql = `-- =========================================
-- PROCESSHUB RLS POLICIES & HELPER FUNCTIONS
-- =========================================

-- 1. HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'superadmin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. ENABLE RLS ON ALL TARGET TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin()
);

-- -----------------------------------------
-- PROCESS UPDATES POLICIES
-- -----------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view updates" ON public.process_updates;
CREATE POLICY "Authenticated users can view updates"
ON public.process_updates
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can create updates" ON public.process_updates;
CREATE POLICY "Admins can create updates"
ON public.process_updates
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins can update updates" ON public.process_updates;
CREATE POLICY "Admins can update updates"
ON public.process_updates
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete updates" ON public.process_updates;
CREATE POLICY "Admins can delete updates"
ON public.process_updates
FOR DELETE
TO authenticated
USING (public.is_admin());

-- -----------------------------------------
-- QUESTIONS POLICIES
-- -----------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.questions;
CREATE POLICY "Authenticated users can view questions"
ON public.questions
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can create questions" ON public.questions;
CREATE POLICY "Admins can create questions"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND created_by = auth.uid()
);

DROP POLICY IF EXISTS "Admins can update questions" ON public.questions;
CREATE POLICY "Admins can update questions"
ON public.questions
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete questions" ON public.questions;
CREATE POLICY "Admins can delete questions"
ON public.questions
FOR DELETE
TO authenticated
USING (public.is_admin());

-- -----------------------------------------
-- RESPONSES POLICIES
-- -----------------------------------------

DROP POLICY IF EXISTS "Agents can submit own responses" ON public.responses;
CREATE POLICY "Agents can submit own responses"
ON public.responses
FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = auth.uid()
  AND NOT public.is_admin()
);

DROP POLICY IF EXISTS "Agents can view own responses" ON public.responses;
CREATE POLICY "Agents can view own responses"
ON public.responses
FOR SELECT
TO authenticated
USING (
  agent_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can update responses" ON public.responses;
CREATE POLICY "Admins can update responses"
ON public.responses
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -----------------------------------------
-- NOTIFICATIONS POLICIES
-- -----------------------------------------

DROP POLICY IF EXISTS "Agents can view own notifications" ON public.notifications;
CREATE POLICY "Agents can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
  agent_id = auth.uid()
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

DROP POLICY IF EXISTS "Agents can update own notifications" ON public.notifications;
CREATE POLICY "Agents can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (agent_id = auth.uid())
WITH CHECK (agent_id = auth.uid());`;

  const fullSqlSchema = `-- ============================================================================
-- ProcessHub Complete Supabase Schema & RLS Policies
-- Project: xxqdxzqdtrqzfoyvpenv
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'superadmin', 'manager', 'agent')),
    avatar_url TEXT,
    team TEXT DEFAULT 'Support Tier 1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: process_updates
CREATE TABLE IF NOT EXISTS public.process_updates (
    id TEXT PRIMARY KEY,
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
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
ALTER TABLE public.process_updates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.process_updates ADD COLUMN IF NOT EXISTS audience JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.process_updates ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.process_updates ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.process_updates ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';
ALTER TABLE public.process_updates ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}'::jsonb;

-- Table: questions
CREATE TABLE IF NOT EXISTS public.questions (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL REFERENCES public.process_updates(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    text TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'multiple-choice',
    points NUMERIC NOT NULL DEFAULT 10,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    correct_answer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Table: responses
CREATE TABLE IF NOT EXISTS public.responses (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL REFERENCES public.process_updates(id) ON DELETE CASCADE,
    question_id TEXT,
    agent_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    submission_id TEXT,
    user_answer TEXT,
    is_correct BOOLEAN DEFAULT FALSE,
    points_awarded NUMERIC DEFAULT 0,
    score NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Table: notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    agent_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Table: agents
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

-- Table: scores
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

${rlsPoliciesSql}
`;

  const handleCopy = (text: string, type: 'all' | 'rls') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
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
    { key: 'profiles', label: '1. Profiles', desc: 'auth.uid() RBAC & role check (is_admin)', isReady: status?.tableStatuses.profiles },
    { key: 'process_updates', label: '2. Process Updates', desc: 'SOPs, categories & created_by', isReady: status?.tableStatuses.process_updates },
    { key: 'questions', label: '3. Questions', desc: 'Certification quizzes & point rubrics', isReady: status?.tableStatuses.questions },
    { key: 'responses', label: '4. Responses', desc: 'Agent question audits (agent_id = auth.uid())', isReady: status?.tableStatuses.responses },
    { key: 'notifications', label: '5. Notifications', desc: 'Targeted agent notifications & alerts', isReady: status?.tableStatuses.notifications },
    { key: 'agents', label: '6. Agents', desc: 'Quality calibration & roster', isReady: status?.tableStatuses.agents },
    { key: 'scores', label: '7. Scores', desc: 'Historical certifications & scorecards', isReady: status?.tableStatuses.scores },
  ];

  const allTablesActive = status?.tablesExist ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[24px]">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg tracking-tight">ProcessHub Supabase & RLS Policies</h3>
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

        {/* Tab Navigation */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('rls')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'rls'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">shield_person</span>
            <span>RLS Policies</span>
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">dns</span>
            <span>Table Checklist</span>
          </button>

          <button
            onClick={() => setActiveTab('full-sql')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'full-sql'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">code</span>
            <span>Complete SQL Schema</span>
          </button>

          <a
            href={`https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql/new`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
          >
            <span>Supabase SQL Editor</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: RLS POLICIES */}
          {activeTab === 'rls' && (
            <div className="space-y-5">
              {/* Overview Callout */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-950 flex items-start gap-3 text-xs">
                <span className="material-symbols-outlined text-indigo-600 text-[22px] shrink-0 mt-0.5">
                  security
                </span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-indigo-900">
                    Row Level Security Architecture Configured
                  </h4>
                  <p className="text-indigo-800/90 leading-relaxed">
                    Policies strictly enforce data isolation: Admins verified through <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-indigo-700">public.is_admin()</code> can publish & calibrate, while Agents only view and submit their own responses (<code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-indigo-700">agent_id = auth.uid()</code>).
                  </p>
                </div>
              </div>

              {/* Policy Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Profiles */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      public.profiles
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      SELECT
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div>• <strong>Users:</strong> view own profile (<code className="font-mono text-slate-800">id = auth.uid()</code>)</div>
                    <div>• <strong>Admins:</strong> view all profiles (<code className="font-mono text-slate-800">public.is_admin()</code>)</div>
                  </div>
                </div>

                {/* Process Updates */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      public.process_updates
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      CRUD
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div>• <strong>Read:</strong> All authenticated users (<code className="font-mono text-slate-800">true</code>)</div>
                    <div>• <strong>Insert:</strong> Admins only (<code className="font-mono text-slate-800">created_by = auth.uid()</code>)</div>
                    <div>• <strong>Update/Delete:</strong> Admins only (<code className="font-mono text-slate-800">public.is_admin()</code>)</div>
                  </div>
                </div>

                {/* Questions */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      public.questions
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      CRUD
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div>• <strong>Read:</strong> All authenticated users (<code className="font-mono text-slate-800">true</code>)</div>
                    <div>• <strong>Insert:</strong> Admins only (<code className="font-mono text-slate-800">created_by = auth.uid()</code>)</div>
                    <div>• <strong>Update/Delete:</strong> Admins only (<code className="font-mono text-slate-800">public.is_admin()</code>)</div>
                  </div>
                </div>

                {/* Responses */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      public.responses
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      SUBMIT & AUDIT
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div>• <strong>Insert:</strong> Agents own responses (<code className="font-mono text-slate-800">agent_id = auth.uid()</code>)</div>
                    <div>• <strong>Read:</strong> Own responses OR Admins (<code className="font-mono text-slate-800">public.is_admin()</code>)</div>
                    <div>• <strong>Update:</strong> Admins calibration</div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      public.notifications
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      NOTIFICATIONS
                    </span>
                  </div>
                  <div className="space-y-1 text-slate-600 text-[11px]">
                    <div>• <strong>Read:</strong> Agent view own notifications (<code className="font-mono text-slate-800">agent_id = auth.uid() or is_admin()</code>)</div>
                    <div>• <strong>Insert:</strong> Admins can broadcast notifications</div>
                    <div>• <strong>Update:</strong> Agents can update read status of own notifications (<code className="font-mono text-slate-800">agent_id = auth.uid()</code>)</div>
                  </div>
                </div>
              </div>

              {/* RLS SQL Code Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">ProcessHub RLS SQL Code</span>
                  <button
                    onClick={() => handleCopy(rlsPoliciesSql, 'rls')}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {copiedType === 'rls' ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedType === 'rls' ? 'Copied RLS SQL!' : 'Copy RLS SQL'}</span>
                  </button>
                </div>
                <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-64 leading-relaxed border border-slate-800 shadow-inner">
                  <pre>{rlsPoliciesSql}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TABLE CHECKLIST */}
          {activeTab === 'overview' && (
            <div className="space-y-5">
              {/* Connection Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 font-medium block">Project REST URL</span>
                  <span className="font-mono text-slate-700 font-semibold truncate block mt-0.5" title={SUPABASE_CONFIG.url}>
                    {SUPABASE_CONFIG.url}
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 font-medium block">API Key Status</span>
                  <span className="font-mono text-slate-700 font-semibold block mt-0.5">
                    {SUPABASE_CONFIG.keyPreview}
                  </span>
                </div>
              </div>

              {/* Database Tables Verification */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Database Tables Status
                  </h4>
                  <button
                    onClick={onRefreshHealth}
                    disabled={isLoading}
                    className="text-xs text-indigo-600 font-bold hover:text-indigo-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className={`material-symbols-outlined text-[15px] ${isLoading ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                    <span>Check Connection</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {tableList.map((tbl) => {
                    const isReady = tbl.isReady ?? false;
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
                          {isReady ? 'Active' : 'Table Pending'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {allTablesActive && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-emerald-600 text-[22px]">
                      verified
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-emerald-900">
                        Supabase Database Live
                      </h5>
                      <p className="text-[11px] text-emerald-700">
                        All reads and writes for processes, questions, user responses, and scores are syncing directly with Supabase.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSeedData}
                    disabled={seeding}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto disabled:opacity-50 shadow-xs"
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
          )}

          {/* TAB 3: COMPLETE SQL SCHEMA */}
          {activeTab === 'full-sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">
                    Complete Database Definition & RLS Policies
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Creates all 7 tables, UUID extension, is_admin() function, and all RLS policies.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(fullSqlSchema, 'all')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiedType === 'all' ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedType === 'all' ? 'Copied Schema!' : 'Copy Full SQL Schema'}</span>
                </button>
              </div>

              <div className="bg-slate-950 text-slate-200 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto max-h-80 leading-relaxed border border-slate-800 shadow-inner">
                <pre>{fullSqlSchema}</pre>
              </div>
            </div>
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
