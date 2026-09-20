-- ============================================================================
-- ProcessHub Complete Supabase Database Schema & RLS Policies
-- Project ID: xxqdxzqdtrqzfoyvpenv
-- Run this in your Supabase Project: Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABLE DEFINITIONS
-- ============================================================================

-- Table 1: profiles (User profiles linked to auth.users)
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

-- Table 2: process_updates (SOPs, Process Documentation & Versioning)
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

-- Table 3: questions (Certification Quiz Questions per Process)
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

-- Table 4: responses (Individual question submissions & audit answers)
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

-- Table 5: notifications (Alerts, policy updates, and quiz assignments)
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

-- Table 6: agents (Team roster & quality calibration metrics)
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

-- Table 7: scores (Graded certifications & full scorecard logs)
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

-- ============================================================================
-- 2. HELPER FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: is_admin()
-- Returns true if the authenticated user has an admin or manager role in profiles
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

-- Auto-create profile upon new user signup in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_questions_process ON public.questions(process_id);
CREATE INDEX IF NOT EXISTS idx_responses_process ON public.responses(process_id);
CREATE INDEX IF NOT EXISTS idx_responses_agent ON public.responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_notifications_agent ON public.notifications(agent_id);
CREATE INDEX IF NOT EXISTS idx_scores_process ON public.scores(process_id);
CREATE INDEX IF NOT EXISTS idx_scores_agent ON public.scores(agent_id);

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. PROCESSHUB RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------

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

DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Allow public read for admin count" ON public.profiles;
CREATE POLICY "Allow public read for admin count"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- ----------------------------------------------------------------------------
-- PROCESS UPDATES
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- QUESTIONS
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- RESPONSES
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------

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
WITH CHECK (agent_id = auth.uid());

-- ----------------------------------------------------------------------------
-- AGENTS & SCORES (Read & Manage RLS)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated can view agents" ON public.agents;
CREATE POLICY "Authenticated can view agents"
ON public.agents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage agents" ON public.agents;
CREATE POLICY "Admins can manage agents"
ON public.agents FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Authenticated can view scores" ON public.scores;
CREATE POLICY "Authenticated can view scores"
ON public.scores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert scores" ON public.scores;
CREATE POLICY "Authenticated can insert scores"
ON public.scores FOR INSERT TO authenticated WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 5. ANONYMOUS / PREVIEW ACCESS (OPTIONAL FOR PREVIEW DEMO)
-- Allows reading demo updates and questions if browsing anonymously in dev
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    DROP POLICY IF EXISTS "Anon select process_updates" ON public.process_updates;
    CREATE POLICY "Anon select process_updates" ON public.process_updates FOR SELECT TO anon USING (true);

    DROP POLICY IF EXISTS "Anon select questions" ON public.questions;
    CREATE POLICY "Anon select questions" ON public.questions FOR SELECT TO anon USING (true);

    DROP POLICY IF EXISTS "Anon select agents" ON public.agents;
    CREATE POLICY "Anon select agents" ON public.agents FOR SELECT TO anon USING (true);

    DROP POLICY IF EXISTS "Anon select scores" ON public.scores;
    CREATE POLICY "Anon select scores" ON public.scores FOR SELECT TO anon USING (true);
END $$;
