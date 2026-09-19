import { supabase } from '../lib/supabase';
import { AuditProcess, Agent, Submission, Question } from '../types';
import { INITIAL_PROCESSES, INITIAL_AGENTS } from '../data/initialData';

export interface SupabaseHealthStatus {
  isConnected: boolean;
  tablesExist: boolean;
  checkedAt: string;
  error?: string;
  tableStatuses: {
    process_updates: boolean;
    questions: boolean;
    agents: boolean;
    scores: boolean;
    user_responses: boolean;
  };
}

/**
 * Checks connection to Supabase and verifies whether required tables exist.
 */
export async function checkSupabaseHealth(): Promise<SupabaseHealthStatus> {
  const result: SupabaseHealthStatus = {
    isConnected: false,
    tablesExist: false,
    checkedAt: new Date().toLocaleTimeString(),
    tableStatuses: {
      process_updates: false,
      questions: false,
      agents: false,
      scores: false,
      user_responses: false,
    },
  };

  try {
    const checks = await Promise.allSettled([
      supabase.from('process_updates').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }),
      supabase.from('scores').select('id', { count: 'exact', head: true }),
      supabase.from('user_responses').select('id', { count: 'exact', head: true }),
    ]);

    result.isConnected = true;

    // Check process_updates
    if (checks[0].status === 'fulfilled' && !checks[0].value.error) {
      result.tableStatuses.process_updates = true;
    }
    // Check questions
    if (checks[1].status === 'fulfilled' && !checks[1].value.error) {
      result.tableStatuses.questions = true;
    }
    // Check agents
    if (checks[2].status === 'fulfilled' && !checks[2].value.error) {
      result.tableStatuses.agents = true;
    }
    // Check scores
    if (checks[3].status === 'fulfilled' && !checks[3].value.error) {
      result.tableStatuses.scores = true;
    }
    // Check user_responses
    if (checks[4].status === 'fulfilled' && !checks[4].value.error) {
      result.tableStatuses.user_responses = true;
    }

    result.tablesExist = Object.values(result.tableStatuses).every(Boolean);

    // If some table had an error, record error message
    for (const check of checks) {
      if (check.status === 'fulfilled' && check.value.error) {
        result.error = check.value.error.message;
        break;
      } else if (check.status === 'rejected') {
        result.error = String(check.reason);
        break;
      }
    }
  } catch (err: any) {
    result.isConnected = false;
    result.error = err?.message || 'Failed to reach Supabase endpoint';
  }

  return result;
}

/**
 * Seeds initial mock data to Supabase if tables exist but are empty.
 */
export async function seedInitialDataIfEmpty(): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('process_updates')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.warn('Cannot check process_updates table for seeding:', error.message);
      return false;
    }

    if (count === 0) {
      console.info('ProcessHub: Seeding initial processes and agents to Supabase...');
      // Seed processes
      for (const proc of INITIAL_PROCESSES) {
        await saveProcessUpdate(proc);
      }
      // Seed agents
      for (const ag of INITIAL_AGENTS) {
        await saveAgent(ag);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error during initial seed check:', err);
    return false;
  }
}

/**
 * Fetch all Process Updates along with their questions from Supabase.
 */
export async function fetchProcessesFromSupabase(): Promise<AuditProcess[] | null> {
  try {
    const { data: procRows, error: procError } = await supabase
      .from('process_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (procError) {
      console.warn('Supabase fetchProcesses failed:', procError.message);
      return null;
    }

    if (!procRows || procRows.length === 0) {
      return [];
    }

    // Fetch questions for all processes
    const { data: questionRows, error: qError } = await supabase
      .from('questions')
      .select('*');

    if (qError) {
      console.warn('Supabase fetch questions failed:', qError.message);
    }

    const questionsByProcess: Record<string, Question[]> = {};
    if (questionRows) {
      for (const q of questionRows) {
        if (!questionsByProcess[q.process_id]) {
          questionsByProcess[q.process_id] = [];
        }
        questionsByProcess[q.process_id].push({
          id: q.id,
          text: q.text,
          type: (q.type as 'multiple-choice' | 'true-false') || 'multiple-choice',
          points: Number(q.points) || 10,
          options: Array.isArray(q.options) ? q.options : [],
        });
      }
    }

    return procRows.map((row) => {
      const questions = questionsByProcess[row.id] || [];
      const totalMarks = questions.reduce((sum, q) => sum + (q.points || 0), 0);

      return {
        id: row.id,
        title: row.title,
        shortDescription: row.short_description || '',
        category: row.category || 'Operations',
        effectiveDate: row.effective_date || '',
        priority: (row.priority as 'Low' | 'Medium' | 'High') || 'Medium',
        status: (row.status as 'Published' | 'Draft') || 'Published',
        content: row.content || { sectionTitle: '', bodyText: '' },
        audience: row.audience || {
          type: 'all',
          selectedTeams: [],
          assignedAgents: [],
          totalActive: 12,
        },
        metrics: row.metrics || {
          completionRate: 0,
          completedCount: 0,
          totalAssigned: 12,
          publishedDate: row.effective_date,
        },
        quiz: {
          totalQuestions: questions.length,
          totalMarks: totalMarks || 100,
          questions: questions,
        },
      };
    });
  } catch (err) {
    console.error('fetchProcessesFromSupabase error:', err);
    return null;
  }
}

/**
 * Save / Upsert a single Process Update and its questions to Supabase.
 */
export async function saveProcessUpdate(proc: AuditProcess): Promise<boolean> {
  try {
    const processRow = {
      id: proc.id,
      title: proc.title,
      short_description: proc.shortDescription,
      category: proc.category,
      effective_date: proc.effectiveDate,
      priority: proc.priority,
      status: proc.status,
      content: proc.content,
      audience: proc.audience,
      metrics: proc.metrics,
      updated_at: new Date().toISOString(),
    };

    const { error: procError } = await supabase
      .from('process_updates')
      .upsert(processRow, { onConflict: 'id' });

    if (procError) {
      console.error('Failed to upsert process_updates:', procError);
      return false;
    }

    // Upsert questions
    if (proc.quiz && proc.quiz.questions && proc.quiz.questions.length > 0) {
      // First clean up deleted questions or upsert current questions
      const questionRows = proc.quiz.questions.map((q) => {
        const correctOpt = q.options?.find((o) => o.isCorrect)?.text || '';
        return {
          id: q.id,
          process_id: proc.id,
          text: q.text,
          type: q.type,
          points: q.points || 10,
          options: q.options || [],
          correct_answer: correctOpt,
        };
      });

      const { error: qError } = await supabase
        .from('questions')
        .upsert(questionRows, { onConflict: 'id' });

      if (qError) {
        console.error('Failed to upsert questions:', qError);
      }
    }

    return true;
  } catch (err) {
    console.error('saveProcessUpdate error:', err);
    return false;
  }
}

/**
 * Delete a process update from Supabase (cascades questions, responses, scores).
 */
export async function deleteProcessFromSupabase(processId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('process_updates').delete().eq('id', processId);
    if (error) {
      console.error('deleteProcessFromSupabase error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('deleteProcessFromSupabase exception:', err);
    return false;
  }
}

/**
 * Fetch all agents from Supabase.
 */
export async function fetchAgentsFromSupabase(): Promise<Agent[] | null> {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('rank', { ascending: true });

    if (error) {
      console.warn('fetchAgentsFromSupabase error:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      agentCode: row.agent_code,
      name: row.name,
      initial: row.initial || row.name.charAt(0).toUpperCase(),
      colorClass: row.color_class || 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white',
      team: row.team || 'Support Tier 1',
      role: row.role || 'Customer Experience Specialist',
      score: Number(row.score) || 85,
      qualityScore: Number(row.quality_score) || Number(row.score) || 85,
      fatalCount: Number(row.fatal_count) || 0,
      callAuditCount: Number(row.call_audit_count) || 1,
      pendingQuizzes: Number(row.pending_quizzes) || 0,
      completedProcesses: Number(row.completed_processes) || 0,
      rank: Number(row.rank) || 1,
      status: (row.status as 'Active' | 'On Leave') || 'Active',
      email: row.email || `${row.name.toLowerCase().replace(/\s+/g, '.')}@processhub.internal`,
    }));
  } catch (err) {
    console.error('fetchAgentsFromSupabase exception:', err);
    return null;
  }
}

/**
 * Save or update an agent in Supabase.
 */
export async function saveAgent(agent: Agent): Promise<boolean> {
  try {
    const row = {
      id: agent.id,
      agent_code: agent.agentCode || null,
      name: agent.name,
      initial: agent.initial,
      color_class: agent.colorClass,
      team: agent.team,
      role: agent.role,
      email: agent.email,
      score: agent.score,
      quality_score: agent.qualityScore,
      fatal_count: agent.fatalCount,
      call_audit_count: agent.callAuditCount,
      pending_quizzes: agent.pendingQuizzes,
      completed_processes: agent.completedProcesses,
      rank: agent.rank,
      status: agent.status,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('agents').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('saveAgent error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('saveAgent exception:', err);
    return false;
  }
}

/**
 * Fetch all quiz scores / submissions from Supabase.
 */
export async function fetchSubmissionsFromSupabase(): Promise<Submission[] | null> {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('fetchSubmissionsFromSupabase error:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      processId: row.process_id,
      processTitle: row.process_title || '',
      agentId: row.agent_id,
      agentName: row.agent_name,
      agentInitial: row.agent_initial || row.agent_name.charAt(0).toUpperCase(),
      agentColor: row.agent_color || 'bg-slate-700 text-white',
      team: row.team || 'Support Tier 1',
      score: Number(row.score),
      totalMarks: Number(row.total_marks),
      percentage: Number(row.percentage),
      passed: Boolean(row.passed),
      submittedAt: row.submitted_at || new Date().toISOString(),
      answersSummary: row.answers_summary,
      answersDetail: row.answers_detail,
    }));
  } catch (err) {
    console.error('fetchSubmissionsFromSupabase exception:', err);
    return null;
  }
}

/**
 * Save a quiz submission and all individual question user responses to Supabase.
 */
export async function saveSubmissionToSupabase(
  sub: Submission,
  responses?: Array<{
    questionId: string;
    userAnswer: string;
    isCorrect: boolean;
    pointsAwarded: number;
  }>
): Promise<boolean> {
  try {
    // 1. Insert Score / Submission
    const scoreRow = {
      id: sub.id,
      process_id: sub.processId,
      process_title: sub.processTitle,
      agent_id: sub.agentId,
      agent_name: sub.agentName,
      agent_initial: sub.agentInitial,
      agent_color: sub.agentColor,
      team: sub.team,
      score: sub.score,
      total_marks: sub.totalMarks,
      percentage: sub.percentage,
      passed: sub.passed,
      submitted_at: sub.submittedAt || new Date().toISOString(),
      answers_summary: sub.answersSummary || {},
      answers_detail: sub.answersDetail || [],
    };

    const { error: scoreError } = await supabase
      .from('scores')
      .upsert(scoreRow, { onConflict: 'id' });

    if (scoreError) {
      console.error('saveSubmissionToSupabase scoreError:', scoreError);
      return false;
    }

    // 2. Insert User Responses
    const respList =
      responses ||
      sub.answersDetail?.map((detail) => ({
        questionId: detail.questionId,
        userAnswer: detail.selectedOptionText || detail.selectedOptionId,
        isCorrect: detail.isCorrect,
        pointsAwarded: detail.pointsEarned,
      })) ||
      [];

    if (respList.length > 0) {
      const responseRows = respList.map((resp, idx) => ({
        id: `${sub.id}-resp-${resp.questionId || idx}`,
        submission_id: sub.id,
        process_id: sub.processId,
        agent_id: sub.agentId,
        question_id: resp.questionId,
        user_answer: resp.userAnswer,
        is_correct: resp.isCorrect,
        points_awarded: resp.pointsAwarded,
      }));

      const { error: respError } = await supabase
        .from('user_responses')
        .upsert(responseRows, { onConflict: 'id' });

      if (respError) {
        console.error('saveSubmissionToSupabase respError:', respError);
      }
    }

    return true;
  } catch (err) {
    console.error('saveSubmissionToSupabase exception:', err);
    return false;
  }
}
