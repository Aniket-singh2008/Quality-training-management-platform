-- ============================================================================
-- ProcessHub Supabase Database Schema
-- Project ID: xxqdxzqdtrqzfoyvpenv
-- Run this in your Supabase Project: Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Table: process_updates
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

-- 2. Table: questions
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

-- 3. Table: agents / users
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

-- 4. Table: scores / submissions
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

-- 5. Table: user_responses
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

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_questions_process ON public.questions(process_id);
CREATE INDEX IF NOT EXISTS idx_scores_process ON public.scores(process_id);
CREATE INDEX IF NOT EXISTS idx_scores_agent ON public.scores(agent_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_submission ON public.user_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_user_responses_agent ON public.user_responses(agent_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.process_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;

-- Permissive public policies for API/Anon access
DO $$
BEGIN
    -- process_updates
    DROP POLICY IF EXISTS "Public select process_updates" ON public.process_updates;
    CREATE POLICY "Public select process_updates" ON public.process_updates FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert process_updates" ON public.process_updates;
    CREATE POLICY "Public insert process_updates" ON public.process_updates FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update process_updates" ON public.process_updates;
    CREATE POLICY "Public update process_updates" ON public.process_updates FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete process_updates" ON public.process_updates;
    CREATE POLICY "Public delete process_updates" ON public.process_updates FOR DELETE USING (true);

    -- questions
    DROP POLICY IF EXISTS "Public select questions" ON public.questions;
    CREATE POLICY "Public select questions" ON public.questions FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert questions" ON public.questions;
    CREATE POLICY "Public insert questions" ON public.questions FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update questions" ON public.questions;
    CREATE POLICY "Public update questions" ON public.questions FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete questions" ON public.questions;
    CREATE POLICY "Public delete questions" ON public.questions FOR DELETE USING (true);

    -- agents
    DROP POLICY IF EXISTS "Public select agents" ON public.agents;
    CREATE POLICY "Public select agents" ON public.agents FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert agents" ON public.agents;
    CREATE POLICY "Public insert agents" ON public.agents FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update agents" ON public.agents;
    CREATE POLICY "Public update agents" ON public.agents FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete agents" ON public.agents;
    CREATE POLICY "Public delete agents" ON public.agents FOR DELETE USING (true);

    -- scores
    DROP POLICY IF EXISTS "Public select scores" ON public.scores;
    CREATE POLICY "Public select scores" ON public.scores FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert scores" ON public.scores;
    CREATE POLICY "Public insert scores" ON public.scores FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update scores" ON public.scores;
    CREATE POLICY "Public update scores" ON public.scores FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete scores" ON public.scores;
    CREATE POLICY "Public delete scores" ON public.scores FOR DELETE USING (true);

    -- user_responses
    DROP POLICY IF EXISTS "Public select user_responses" ON public.user_responses;
    CREATE POLICY "Public select user_responses" ON public.user_responses FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public insert user_responses" ON public.user_responses;
    CREATE POLICY "Public insert user_responses" ON public.user_responses FOR INSERT WITH CHECK (true);
    DROP POLICY IF EXISTS "Public update user_responses" ON public.user_responses;
    CREATE POLICY "Public update user_responses" ON public.user_responses FOR UPDATE USING (true);
    DROP POLICY IF EXISTS "Public delete user_responses" ON public.user_responses;
    CREATE POLICY "Public delete user_responses" ON public.user_responses FOR DELETE USING (true);
END $$;
