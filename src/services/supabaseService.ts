import { supabase, createEphemeralClient } from '../lib/supabase';
import { AuditProcess, Agent, Submission, Question, UserProfile, NotificationItem } from '../types';
import { INITIAL_PROCESSES, INITIAL_AGENTS } from '../data/initialData';

export interface SupabaseHealthStatus {
  isConnected: boolean;
  tablesExist: boolean;
  checkedAt: string;
  error?: string;
  tableStatuses: {
    profiles: boolean;
    process_updates: boolean;
    questions: boolean;
    responses: boolean;
    notifications: boolean;
    agents: boolean;
    scores: boolean;
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
      profiles: false,
      process_updates: false,
      questions: false,
      responses: false,
      notifications: false,
      agents: false,
      scores: false,
    },
  };

  try {
    const checks = await Promise.allSettled([
      supabase.from('process_updates').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('agents').select('id', { count: 'exact', head: true }),
      supabase.from('scores').select('id', { count: 'exact', head: true }),
      supabase.from('responses').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('notifications').select('id', { count: 'exact', head: true }),
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
    // Check responses (or fallback to user_responses)
    if (checks[4].status === 'fulfilled' && !checks[4].value.error) {
      result.tableStatuses.responses = true;
    } else {
      // Fallback check user_responses
      const urCheck = await supabase.from('user_responses').select('id', { count: 'exact', head: true });
      if (!urCheck.error) {
        result.tableStatuses.responses = true;
      }
    }
    // Check profiles
    if (checks[5].status === 'fulfilled' && !checks[5].value.error) {
      result.tableStatuses.profiles = true;
    }
    // Check notifications
    if (checks[6].status === 'fulfilled' && !checks[6].value.error) {
      result.tableStatuses.notifications = true;
    }

    // Core tables: process_updates and questions are mandatory for SOP workflow
    result.tablesExist =
      Boolean(result.tableStatuses.process_updates && result.tableStatuses.questions);

    // Only report error if connection failed or primary process_updates table is inaccessible
    if (!result.tableStatuses.process_updates) {
      if (checks[0].status === 'fulfilled' && checks[0].value.error) {
        result.error = checks[0].value.error.message;
      }
    }
  } catch (err: any) {
    result.isConnected = false;
    result.error = err?.message || 'Failed to reach Supabase endpoint';
  }

  return result;
}

// ============================================================================
// AUTHENTICATION & ROLE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Checks how many admin profiles exist in public.profiles.
 * Employs local persistence cache fallback to prevent transient reset.
 */
export async function getAdminCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (!error && typeof count === 'number' && count > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('processhub_admin_initialized', 'true');
      }
      return count;
    }

    if (typeof window !== 'undefined') {
      const localInit = localStorage.getItem('processhub_admin_initialized');
      if (localInit === 'true') {
        return 1;
      }
    }

    return count ?? 0;
  } catch (err) {
    console.warn('getAdminCount error:', err);
    if (typeof window !== 'undefined') {
      return localStorage.getItem('processhub_admin_initialized') === 'true' ? 1 : 0;
    }
    return 0;
  }
}

/**
 * Fetches a user profile from public.profiles by auth ID.
 * Targets only existing columns in table: [id, full_name, role, is_active, created_at].
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('fetchUserProfile note:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: '',
      fullName: data.full_name || 'User',
      role: (data.role as 'admin' | 'agent') || 'agent',
      isActive: data.is_active !== false,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.warn('fetchUserProfile error:', err);
    return null;
  }
}

/**
 * Fetches current authenticated session and verifies the role profile.
 */
export async function getCurrentSessionAndProfile(): Promise<{
  session: any | null;
  user: any | null;
  profile: UserProfile | null;
}> {
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    
    // Check cached profile if session check returned empty
    if (sessionErr || !sessionData?.session) {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('processhub_cached_profile');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.id && parsed.role) {
              return { session: null, user: null, profile: parsed };
            }
          } catch {
            // ignore
          }
        }
      }
      return { session: null, user: null, profile: null };
    }

    const user = sessionData.session.user;
    let profile = await fetchUserProfile(user.id);

    if (profile) {
      profile.email = user.email || '';
      if (typeof window !== 'undefined') {
        localStorage.setItem('processhub_cached_profile', JSON.stringify(profile));
        if (profile.role === 'admin') {
          localStorage.setItem('processhub_admin_initialized', 'true');
        }
      }
    } else {
      // Auto-provision or recover profile from auth metadata if not found in table
      const metaName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const metaRole = (user.user_metadata?.role as 'admin' | 'agent') || 'agent';

      try {
        const { data: inserted, error: insErr } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: metaName,
            role: metaRole,
            is_active: true,
          })
          .select('id, full_name, role, is_active, created_at')
          .maybeSingle();

        if (inserted && !insErr) {
          profile = {
            id: inserted.id,
            email: user.email || '',
            fullName: inserted.full_name,
            role: inserted.role,
            isActive: inserted.is_active !== false,
            createdAt: inserted.created_at,
          };
        }
      } catch (err) {
        console.warn('Profile self-provision error:', err);
      }

      if (!profile) {
        profile = {
          id: user.id,
          email: user.email || '',
          fullName: metaName,
          role: metaRole,
          isActive: true,
        };
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('processhub_cached_profile', JSON.stringify(profile));
        if (profile.role === 'admin') {
          localStorage.setItem('processhub_admin_initialized', 'true');
        }
      }
    }

    return { session: sessionData.session, user, profile };
  } catch (err) {
    console.warn('getCurrentSessionAndProfile error:', err);
    return { session: null, user: null, profile: null };
  }
}

/**
 * Sign in user with email & password via Supabase Auth.
 * Enforces is_active check for agent accounts and detects pending email verification.
 */
export async function signInUser(
  email: string,
  pass: string
): Promise<{
  success: boolean;
  requiresEmailVerification?: boolean;
  email?: string;
  error?: string;
  user?: any;
  session?: any;
  profile?: UserProfile;
}> {
  try {
    const trimmedEmail = email.trim();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: pass,
    });

    if (error) {
      if (
        error.message.toLowerCase().includes('email not confirmed') ||
        (error as any).code === 'email_not_confirmed'
      ) {
        return {
          success: false,
          requiresEmailVerification: true,
          email: trimmedEmail,
          error:
            'Your email is awaiting verification. Please enter the 6-digit verification code sent to your email to activate your account and sign in.',
        };
      }
      return { success: false, error: error.message };
    }

    if (!data.user || !data.session) {
      return { success: false, error: 'Login failed: no active session returned.' };
    }

    // Retrieve user profile
    let profile = await fetchUserProfile(data.user.id);

    if (!profile) {
      const metaName = data.user.user_metadata?.full_name || trimmedEmail.split('@')[0];
      const metaRole = (data.user.user_metadata?.role as 'admin' | 'agent') || 'agent';

      try {
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: metaName,
          role: metaRole,
          is_active: true,
        });
      } catch {
        // continue
      }

      profile = {
        id: data.user.id,
        email: data.user.email || trimmedEmail,
        fullName: metaName,
        role: metaRole,
        isActive: true,
      };
    } else {
      profile.email = data.user.email || trimmedEmail;
    }

    // Account activation check: if deactivated by admin, immediately sign out
    if (profile.isActive === false) {
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('processhub_cached_profile');
      }
      return {
        success: false,
        error: 'Your agent account has been deactivated by the administrator. Please contact your QA Lead.',
      };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('processhub_cached_profile', JSON.stringify(profile));
      if (profile.role === 'admin') {
        localStorage.setItem('processhub_admin_initialized', 'true');
      }
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
      profile,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'An error occurred during authentication.' };
  }
}

/**
 * Registers the initial Primary Admin account.
 * Allowed ONLY if no primary admin exists in public.profiles.
 * Handles both instant session (confirm email OFF) and OTP verification (confirm email ON).
 */
export async function registerPrimaryAdmin(
  email: string,
  pass: string,
  fullName: string
): Promise<{
  success: boolean;
  requiresEmailVerification?: boolean;
  isRateLimited?: boolean;
  email?: string;
  error?: string;
  user?: any;
  session?: any;
  profile?: UserProfile;
}> {
  try {
    const count = await getAdminCount();
    if (count > 0) {
      return {
        success: false,
        error: 'A Primary Admin account is already configured. Public admin registration is prohibited.',
      };
    }

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: pass,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: trimmedName,
          role: 'admin',
        },
      },
    });

    if (error) {
      const isRateLimited =
        error.message.toLowerCase().includes('rate limit') ||
        (error as any).code === 'over_email_send_rate_limit' ||
        (error as any).status === 429;

      // In case the user already exists in auth.users (either prior attempt or rate limit)
      const signInRes = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });

      if (signInRes.data?.session && signInRes.data?.user) {
        const user = signInRes.data.user;
        const session = signInRes.data.session;
        let profile = await fetchUserProfile(user.id);
        if (!profile) {
          try {
            await supabase.from('profiles').upsert({
              id: user.id,
              full_name: trimmedName || user.user_metadata?.full_name || 'Primary Admin',
              role: 'admin',
              is_active: true,
            });
          } catch (err) {
            console.warn('Profile upsert note:', err);
          }
          profile = {
            id: user.id,
            email: trimmedEmail,
            fullName: trimmedName || user.user_metadata?.full_name || 'Primary Admin',
            role: 'admin',
            isActive: true,
          };
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('processhub_admin_initialized', 'true');
          localStorage.setItem('processhub_cached_profile', JSON.stringify(profile));
        }
        return { success: true, session, user, profile };
      }

      if (
        signInRes.error?.message?.toLowerCase().includes('email not confirmed') ||
        (signInRes.error as any)?.code === 'email_not_confirmed'
      ) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('processhub_admin_initialized', 'true');
        }
        return {
          success: false,
          requiresEmailVerification: true,
          isRateLimited,
          email: trimmedEmail,
          error: isRateLimited
            ? 'Account is created in Supabase Auth, but Supabase free SMTP hit its rate limit (3 emails/hr). Outgoing verification emails are temporarily blocked.'
            : 'Your Primary Admin account is created and awaiting email verification.',
        };
      }

      if (isRateLimited) {
        return {
          success: false,
          isRateLimited: true,
          requiresEmailVerification: true,
          email: trimmedEmail,
          error:
            'Supabase email rate limit exceeded (over_email_send_rate_limit). Supabase free tier limits built-in emails to 3-4 per hour. Outgoing verification emails are blocked.',
        };
      }

      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Registration failed: user account could not be created.' };
    }

    // Check if session was returned directly
    let session = data.session;
    if (!session) {
      const signInRes = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: pass,
      });
      if (signInRes.data?.session) {
        session = signInRes.data.session;
      }
    }

    // Session is active (email confirmations disabled or auto-confirmed)
    if (session) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: trimmedName,
          role: 'admin',
          is_active: true,
        });
      } catch (insertErr) {
        console.warn('Admin profile upsert note:', insertErr);
      }

      const profile: UserProfile = {
        id: data.user.id,
        email: trimmedEmail,
        fullName: trimmedName,
        role: 'admin',
        isActive: true,
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem('processhub_admin_initialized', 'true');
        localStorage.setItem('processhub_cached_profile', JSON.stringify(profile));
      }

      return {
        success: true,
        user: data.user,
        session,
        profile,
      };
    }

    // Email confirmation is required by Supabase Auth
    if (typeof window !== 'undefined') {
      localStorage.setItem('processhub_admin_initialized', 'true');
    }

    return {
      success: false,
      requiresEmailVerification: true,
      email: trimmedEmail,
      user: data.user,
      error: `A 6-digit verification code has been sent to ${trimmedEmail}. Please enter the code below to activate your Primary Admin account.`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to register Primary Admin.' };
  }
}

/**
 * Verifies the 6-digit OTP code sent to user email.
 * Establishes active Supabase Auth session and persists the admin profile.
 */
export async function verifyPrimaryAdminOtp(
  email: string,
  token: string,
  fullName?: string
): Promise<{
  success: boolean;
  error?: string;
  user?: any;
  session?: any;
  profile?: UserProfile;
}> {
  try {
    const cleanEmail = email.trim();
    const cleanToken = token.trim();

    // First attempt type: 'signup'
    let { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'signup',
    });

    // If 'signup' fails, fallback to 'email' (for login/magic OTP)
    if (error) {
      const fallbackRes = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: 'email',
      });
      if (!fallbackRes.error && fallbackRes.data.session) {
        data = fallbackRes.data;
        error = null;
      }
    }

    if (error) {
      return {
        success: false,
        error:
          error.message ||
          'Invalid or expired verification code. Please check your inbox or spam folder, or click Resend.',
      };
    }

    if (!data.session || !data.user) {
      return {
        success: false,
        error: 'Verification succeeded but no active session was returned. Please try signing in.',
      };
    }

    const user = data.user;
    const session = data.session;
    const name =
      fullName?.trim() ||
      user.user_metadata?.full_name ||
      cleanEmail.split('@')[0] ||
      'Primary Admin';

    // Persist into public.profiles with the newly authenticated session
    try {
      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name,
        role: 'admin',
        is_active: true,
      });
      if (profErr) {
        console.warn('Upsert profile after OTP note:', profErr.message);
      }
    } catch (upsertErr) {
      console.warn('Profile upsert note:', upsertErr);
    }

    const profile: UserProfile = {
      id: user.id,
      email: cleanEmail,
      fullName: name,
      role: 'admin',
      isActive: true,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('processhub_admin_initialized', 'true');
      localStorage.setItem('processhub_cached_profile', JSON.stringify(profile));
    }

    return {
      success: true,
      session,
      user,
      profile,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Verification failed. Please try again.' };
  }
}

/**
 * Resends the 6-digit confirmation email/code to the user.
 */
export async function resendVerificationOtp(email: string): Promise<{
  success: boolean;
  isRateLimited?: boolean;
  error?: string;
}> {
  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      const isRateLimited =
        error.message.toLowerCase().includes('rate limit') ||
        (error as any).code === 'over_email_send_rate_limit' ||
        (error as any).status === 429;

      if (isRateLimited) {
        return {
          success: false,
          isRateLimited: true,
          error:
            'Supabase free tier rate limit exceeded (3-4 emails/hr). Outgoing verification emails are temporarily blocked.',
        };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to resend verification code.' };
  }
}

/**
 * Provisions a new agent account by Admin.
 * Uses an ephemeral client so the Admin's active session is NEVER wiped or replaced.
 */
export async function createAgentAccountByAdmin(
  email: string,
  pass: string,
  fullName: string,
  team: string = 'Escalations Squad',
  role: string = 'QA Support Associate'
): Promise<{
  success: boolean;
  error?: string;
  userId?: string;
}> {
  try {
    const ephemeralClient = createEphemeralClient();
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
    const { data, error } = await ephemeralClient.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName.trim(),
          role: 'agent',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      const agentId = data.user.id;

      // 1. Upsert profile in Supabase
      try {
        await supabase.from('profiles').upsert({
          id: agentId,
          full_name: fullName.trim(),
          role: 'agent',
          is_active: true,
        });
      } catch (profErr) {
        console.warn('Agent profile upsert note:', profErr);
      }

      // 2. Insert welcome notification into public.notifications
      try {
        await supabase.from('notifications').insert({
          id: `notif-welcome-${agentId}-${Date.now()}`,
          agent_id: agentId,
          title: 'Welcome to ProcessHub QA Portal',
          message: 'Your agent compliance portal has been provisioned by QA Administration. Review published SOPs and complete your knowledge check assessments.',
          created_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn('Welcome notification note:', notifErr);
      }

      // 3. Cache agent locally
      try {
        const cached = localStorage.getItem('processhub_agents_cache');
        const list: Agent[] = cached ? JSON.parse(cached) : [];
        const newAg: Agent = {
          id: agentId,
          agentCode: `AG-${agentId.slice(0, 4).toUpperCase()}`,
          name: fullName.trim(),
          initial: fullName.trim().charAt(0).toUpperCase(),
          colorClass: 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white',
          team,
          role,
          score: 88,
          qualityScore: 88,
          fatalCount: 0,
          callAuditCount: 15,
          pendingQuizzes: 1,
          completedProcesses: 1,
          rank: list.length + 1,
          status: 'Active',
          email: email.trim(),
        };
        const exists = list.findIndex((a) => a.id === agentId || a.email.toLowerCase() === email.trim().toLowerCase());
        if (exists >= 0) {
          list[exists] = newAg;
        } else {
          list.push(newAg);
        }
        localStorage.setItem('processhub_agents_cache', JSON.stringify(list));
      } catch {
        // ignore
      }

      return { success: true, userId: agentId };
    }

    return { success: false, error: 'Failed to create agent user.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create agent account.' };
  }
}

/**
 * Toggles an agent's active status in public.profiles.
 */
export async function toggleAgentActiveStatus(
  profileId: string,
  isActive: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', profileId);

    if (error) {
      console.warn('toggleAgentActiveStatus note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('toggleAgentActiveStatus error:', err);
    return false;
  }
}

/**
 * Signs out of Supabase Auth.
 */
export async function signOutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('signOutUser error:', err);
  }
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
      return false;
    }

    if (count === 0) {
      console.info('ProcessHub: Seeding initial processes to Supabase...');
      // Seed processes
      for (const proc of INITIAL_PROCESSES) {
        await saveProcessUpdate(proc);
      }

      // Only attempt to seed agents if the agents table exists in the database
      const { error: agTableError } = await supabase
        .from('agents')
        .select('id', { count: 'exact', head: true });

      if (!agTableError) {
        for (const ag of INITIAL_AGENTS) {
          await saveAgent(ag);
        }
      }
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Initial seed check note:', err);
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
      console.warn('Supabase fetchProcesses note:', procError.message);
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
      console.warn('Supabase fetch questions note:', qError.message);
    }

    const questionsByProcess: Record<string, Question[]> = {};
    if (questionRows) {
      for (const q of questionRows) {
        const processKey = q.update_id || q.process_id;
        if (!processKey) continue;
        if (!questionsByProcess[processKey]) {
          questionsByProcess[processKey] = [];
        }

        let qText = q.question_text || q.text || '';
        let qType: 'multiple-choice' | 'true-false' = (q.type as any) || 'multiple-choice';
        let qOptions = Array.isArray(q.options) ? q.options : [];

        // Check if question_text is packed JSON
        if (typeof q.question_text === 'string' && q.question_text.startsWith('{')) {
          try {
            const parsed = JSON.parse(q.question_text);
            qText = parsed.text || qText;
            qType = parsed.type || qType;
            if (Array.isArray(parsed.options) && parsed.options.length > 0) {
              qOptions = parsed.options;
            }
          } catch {
            // fallback
          }
        }

        if (qOptions.length === 0) {
          const correctText = q.correct_answer || 'Compliant with protocol';
          qOptions = [
            { id: `${q.id}-opt-1`, text: correctText, isCorrect: true },
            { id: `${q.id}-opt-2`, text: 'Escalate to QA supervisor directly', isCorrect: false },
            { id: `${q.id}-opt-3`, text: 'Log exception without customer verification', isCorrect: false },
            { id: `${q.id}-opt-4`, text: 'Bypass verification step', isCorrect: false },
          ];
        }

        questionsByProcess[processKey].push({
          id: q.id,
          text: qText,
          type: qType,
          points: Number(q.points) || 10,
          options: qOptions,
        });
      }
    }

    return procRows.map((row) => {
      const questions = questionsByProcess[row.id] || [];
      const totalMarks = questions.reduce((sum, q) => sum + (q.points || 0), 0);

      let meta: any = {};
      if (typeof row.description === 'string' && row.description.startsWith('{')) {
        try {
          meta = JSON.parse(row.description);
        } catch {
          meta = { shortDescription: row.description };
        }
      } else {
        meta = { shortDescription: row.description || '' };
      }

      const contentObj = row.content || meta.content || {
        sectionTitle: 'Operational Standard Procedure',
        bodyText: meta.shortDescription || row.description || '',
      };

      return {
        id: row.id,
        title: row.title,
        shortDescription:
          meta.shortDescription ||
          row.short_description ||
          row.description ||
          '',
        category: meta.category || row.category || 'Operations',
        effectiveDate:
          meta.effectiveDate ||
          row.effective_date ||
          (row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Today'),
        priority: ((meta.priority || row.priority || 'Medium') as 'Low' | 'Medium' | 'High'),
        status: ((meta.status || row.status || 'Published') as 'Published' | 'Draft'),
        content: contentObj,
        audience: meta.audience || row.audience || {
          type: 'all',
          selectedTeams: [],
          assignedAgents: [],
          totalActive: 12,
        },
        metrics: meta.metrics || row.metrics || {
          completionRate: 0,
          completedCount: 0,
          totalAssigned: 12,
          publishedDate: meta.effectiveDate || row.effective_date,
        },
        quiz: {
          totalQuestions: questions.length,
          totalMarks: totalMarks || 100,
          questions: questions,
        },
      };
    });
  } catch (err) {
    console.warn('fetchProcessesFromSupabase note:', err);
    return null;
  }
}

/**
 * Save / Upsert a single Process Update and its questions to Supabase.
 */
export async function saveProcessUpdate(proc: AuditProcess): Promise<boolean> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;

    // Pack rich metadata into JSON for description column (guaranteed schema support)
    const meta = {
      shortDescription: proc.shortDescription,
      category: proc.category,
      effectiveDate: proc.effectiveDate,
      priority: proc.priority,
      status: proc.status,
      content: proc.content,
      audience: proc.audience,
      metrics: proc.metrics,
    };

    const processRow: Record<string, any> = {
      id: proc.id,
      title: proc.title,
      description: JSON.stringify(meta),
    };

    if (currentUserId) {
      processRow.created_by = currentUserId;
    }

    const { error: procError } = await supabase
      .from('process_updates')
      .upsert(processRow, { onConflict: 'id' });

    if (procError) {
      console.warn('saveProcessUpdate note:', procError.message);
      // If RLS blocked with created_by or unauthenticated, attempt without created_by
      if (processRow.created_by) {
        delete processRow.created_by;
        const retry = await supabase
          .from('process_updates')
          .upsert(processRow, { onConflict: 'id' });
        if (retry.error) {
          console.warn('saveProcessUpdate retry note:', retry.error.message);
          return false;
        }
      } else {
        return false;
      }
    }

    // Upsert questions
    if (proc.quiz && proc.quiz.questions && proc.quiz.questions.length > 0) {
      const questionRows = proc.quiz.questions.map((q) => {
        const correctOpt = q.options?.find((o) => o.isCorrect)?.text || '';
        const packedText = JSON.stringify({
          text: q.text,
          type: q.type,
          options: q.options || [],
        });

        return {
          id: q.id,
          update_id: proc.id,
          question_text: packedText,
          points: q.points || 10,
          correct_answer: correctOpt,
        };
      });

      const { error: qError } = await supabase
        .from('questions')
        .upsert(questionRows, { onConflict: 'id' });

      if (qError) {
        console.warn('saveQuestions note:', qError.message);
      }
    }

    return true;
  } catch (err) {
    console.warn('saveProcessUpdate exception:', err);
    return false;
  }
}

/**
 * Delete a process update from Supabase (cascades questions, responses).
 */
export async function deleteProcessFromSupabase(processId: string): Promise<boolean> {
  try {
    // Delete questions first
    await supabase.from('questions').delete().eq('update_id', processId);
    await supabase.from('questions').delete().eq('process_id', processId);

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
      // If table 'agents' doesn't exist in Supabase (PGRST205)
      if (
        error.code === 'PGRST205' ||
        error.message?.includes("Could not find the table 'public.agents'")
      ) {
        // 1. Try checking profiles table
        try {
          const { data: profileRows, error: pError } = await supabase
            .from('profiles')
            .select('*');

          if (!pError && profileRows && profileRows.length > 0) {
            return profileRows.map((p, idx) => ({
              id: p.id,
              agentCode: `AG-${1000 + idx}`,
              name: p.full_name || p.email?.split('@')[0] || `Agent ${idx + 1}`,
              initial: (p.full_name || p.email || 'A').charAt(0).toUpperCase(),
              colorClass: 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white',
              team: p.team || 'Support Tier 1',
              role: p.role || 'Customer Experience Specialist',
              score: 85,
              qualityScore: 85,
              fatalCount: 0,
              callAuditCount: 1,
              pendingQuizzes: 0,
              completedProcesses: 0,
              rank: idx + 1,
              status: 'Active',
              email:
                p.email ||
                `${(p.full_name || 'agent').toLowerCase().replace(/\s+/g, '.')}@processhub.internal`,
            }));
          }
        } catch {
          // ignore
        }

        // 2. Check localStorage cache
        try {
          const cached = localStorage.getItem('processhub_agents_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              return parsed;
            }
          }
        } catch {
          // ignore
        }

        return null;
      }

      console.warn('fetchAgentsFromSupabase note:', error.message);
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
    console.warn('fetchAgentsFromSupabase exception:', err);
    return null;
  }
}

/**
 * Save or update an agent in Supabase.
 * If public.agents table does not exist, saves locally and updates profile if applicable.
 */
export async function saveAgent(agent: Agent): Promise<boolean> {
  // Always cache locally so agent edits and calibrations persist seamlessly
  try {
    const raw = localStorage.getItem('processhub_agents_cache');
    const list: Agent[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      list[idx] = agent;
    } else {
      list.push(agent);
    }
    localStorage.setItem('processhub_agents_cache', JSON.stringify(list));
  } catch {
    // ignore
  }

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
      // Table agents not in schema cache (PGRST205)
      if (
        error.code === 'PGRST205' ||
        error.message?.includes("Could not find the table 'public.agents'")
      ) {
        // Optional sync to profiles if UUID or profile exists
        try {
          await supabase.from('profiles').upsert(
            {
              id: agent.id,
              full_name: agent.name,
              team: agent.team,
              role: 'agent',
              email: agent.email,
            },
            { onConflict: 'id' }
          );
        } catch {
          // ignore
        }
        return true;
      }
      console.warn('saveAgent note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('saveAgent exception (cached locally):', err);
    return true;
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
      // If table 'scores' does not exist (PGRST205)
      if (
        error.code === 'PGRST205' ||
        error.message?.includes("Could not find the table 'public.scores'")
      ) {
        try {
          const cached = localStorage.getItem('processhub_submissions_cache');
          if (cached) return JSON.parse(cached);
        } catch {
          // ignore
        }
        return [];
      }
      console.warn('fetchSubmissionsFromSupabase note:', error.message);
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
    console.warn('fetchSubmissionsFromSupabase exception:', err);
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
    // 1. Cache submission locally first
    try {
      const raw = localStorage.getItem('processhub_submissions_cache');
      const list: Submission[] = raw ? JSON.parse(raw) : [];
      list.unshift(sub);
      localStorage.setItem('processhub_submissions_cache', JSON.stringify(list.slice(0, 50)));
    } catch {
      // ignore
    }

    // 2. Insert Score / Submission
    const scoreRow = {
      id: sub.id,
      process_id: sub.processId,
      process_title: sub.processTitle,
      agent_id: sub.agentId,
      agentName: sub.agentName,
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

    let scoreSaved = false;
    const { error: scoreError } = await supabase
      .from('scores')
      .upsert(scoreRow, { onConflict: 'id' });

    if (!scoreError) {
      scoreSaved = true;
    } else {
      if (
        scoreError.code === 'PGRST205' ||
        scoreError.message?.includes("Could not find the table 'public.scores'")
      ) {
        // Table scores not yet created; stored locally
        scoreSaved = true;
      } else {
        console.warn('saveSubmissionToSupabase score note:', scoreError.message);
      }
    }

    // 3. Insert User Responses
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;

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
        question_id: resp.questionId,
        agent_id: currentUserId || sub.agentId,
        is_correct: resp.isCorrect,
        score: resp.pointsAwarded,
      }));

      // Try writing to responses table (exact live schema: id, question_id, agent_id, is_correct, score)
      const { error: respError } = await supabase
        .from('responses')
        .upsert(responseRows, { onConflict: 'id' });

      if (respError) {
        // Fallback to user_responses if table name differs
        try {
          await supabase.from('user_responses').upsert(responseRows, { onConflict: 'id' });
        } catch {
          // ignore
        }
      }
    }

    return scoreSaved;
  } catch (err) {
    console.warn('saveSubmissionToSupabase exception:', err);
    return true;
  }
}

/**
 * Broadcast notifications to agents when a new process update is published.
 */
export async function broadcastProcessPublishNotification(
  proc: AuditProcess,
  targetAgentIds?: string[]
): Promise<boolean> {
  try {
    let agentIds: string[] = [];

    if (targetAgentIds && targetAgentIds.length > 0) {
      agentIds = targetAgentIds;
    } else {
      // Query agents from profiles table
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'agent');

      if (profileRows && profileRows.length > 0) {
        agentIds = profileRows.map((p) => p.id);
      }
    }

    // If no agents retrieved from database yet, notify current cached agents
    if (agentIds.length === 0) {
      try {
        const cached = localStorage.getItem('processhub_agents_cache');
        if (cached) {
          const agents: Agent[] = JSON.parse(cached);
          agentIds = agents.map((a) => a.id);
        }
      } catch {
        // ignore
      }
    }

    const qCount = proc.quiz?.questions?.length || 0;
    const notifRows = agentIds.map((agId) => ({
      id: `notif-${proc.id}-${agId}-${Date.now()}`,
      agent_id: agId,
      title: `New SOP: ${proc.title}`,
      message: `QA Lead published a new procedure with ${qCount} knowledge check questions. Complete your assessment to maintain certification compliance.`,
      created_at: new Date().toISOString(),
    }));

    if (notifRows.length > 0) {
      const { error } = await supabase.from('notifications').insert(notifRows);
      if (error) {
        console.warn('broadcastProcessPublishNotification note:', error.message);
      }
    }

    // Always update local notifications cache so agents see it immediately
    try {
      const cached = localStorage.getItem('processhub_notifications_cache');
      const currentList: NotificationItem[] = cached ? JSON.parse(cached) : [];
      const newNotif: NotificationItem = {
        id: `notif-${proc.id}-${Date.now()}`,
        title: `New SOP: ${proc.title}`,
        message: `QA Lead published a new procedure with ${qCount} knowledge check questions.`,
        time: 'Just now',
        read: false,
        type: 'alert',
      };
      localStorage.setItem(
        'processhub_notifications_cache',
        JSON.stringify([newNotif, ...currentList].slice(0, 30))
      );
    } catch {
      // ignore
    }

    return true;
  } catch (err) {
    console.warn('broadcastProcessPublishNotification exception:', err);
    return false;
  }
}

/**
 * Fetch notifications for an agent or admin.
 */
export async function fetchNotificationsFromSupabase(
  agentId?: string
): Promise<NotificationItem[] | null> {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (agentId) {
      query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('fetchNotificationsFromSupabase note:', error.message);
      // Fallback to local storage
      try {
        const cached = localStorage.getItem('processhub_notifications_cache');
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
      return null;
    }

    if (!data || data.length === 0) {
      try {
        const cached = localStorage.getItem('processhub_notifications_cache');
        if (cached) return JSON.parse(cached);
      } catch {
        // ignore
      }
      return null;
    }

    return data.map((row) => ({
      id: row.id,
      title: row.title || 'ProcessHub Notification',
      message: row.message || '',
      time: row.created_at ? new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
      read: Boolean(row.is_read ?? row.read ?? false),
      type: (row.type as 'alert' | 'success' | 'info') || 'alert',
    }));
  } catch (err) {
    console.warn('fetchNotificationsFromSupabase exception:', err);
    return null;
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationReadInSupabase(notificationId: string): Promise<boolean> {
  try {
    // Attempt database update
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    // Update local cache
    try {
      const cached = localStorage.getItem('processhub_notifications_cache');
      if (cached) {
        const list: NotificationItem[] = JSON.parse(cached);
        const updated = list.map((n) => (n.id === notificationId ? { ...n, read: true } : n));
        localStorage.setItem('processhub_notifications_cache', JSON.stringify(updated));
      }
    } catch {
      // ignore
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Mark all notifications as read for current user.
 */
export async function markAllNotificationsReadInSupabase(agentId?: string): Promise<boolean> {
  try {
    let query = supabase.from('notifications').update({ is_read: true });
    if (agentId) {
      query = query.eq('agent_id', agentId);
    } else {
      query = query.neq('id', '');
    }
    await query;

    // Update local cache
    try {
      const cached = localStorage.getItem('processhub_notifications_cache');
      if (cached) {
        const list: NotificationItem[] = JSON.parse(cached);
        const updated = list.map((n) => ({ ...n, read: true }));
        localStorage.setItem('processhub_notifications_cache', JSON.stringify(updated));
      }
    } catch {
      // ignore
    }

    return true;
  } catch {
    return false;
  }
}
