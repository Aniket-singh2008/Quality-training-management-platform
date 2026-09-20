import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const FALLBACK_SUPABASE_URL = 'https://xxqdxzqdtrqzfoyvpenv.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_o4z9x2zdBo6Umu8VUDjjDw_d7EF0oOJ';

function getSupabaseUrl(): string {
  const raw = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  return `https://${clean}.supabase.co`;
}

function getAdminSecretKey(): string | null {
  try {
    const secretKeys = JSON.parse(process.env.SUPABASE_SECRET_KEYS || '{}');
    if (secretKeys && typeof secretKeys['default'] === 'string' && secretKeys['default'].trim()) {
      return secretKeys['default'].trim();
    }
  } catch {
    // ignore
  }
  return null;
}

function getAnonKey(): string {
  const raw = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;
  return raw.trim().replace(/^["']|["']$/g, '');
}

let cachedAdminClient: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient | null {
  const adminKey = getAdminSecretKey();
  if (!adminKey) return null;
  if (!cachedAdminClient) {
    cachedAdminClient = createClient(getSupabaseUrl(), adminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cachedAdminClient;
}

async function handleCreateAgent(req: Request, res: Response) {
  try {
    const { email, password, fullName, team = 'Escalations Squad', role = 'QA Support Associate' } = req.body || {};

    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Full name, email, and password are required to provision an agent.',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(fullName).trim();
    const cleanPassword = String(password).trim();
    const cleanTeam = String(team).trim();

    const supabaseAdmin = getSupabaseAdmin();
    const supabaseUrl = getSupabaseUrl();
    const anonKey = getAnonKey();

    // Verify admin caller authorization if token is provided
    const authHeader = req.headers.authorization;
    if (authHeader && supabaseAdmin) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token) {
        const { data: authUser, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !authUser?.user) {
          return res.status(401).json({
            success: false,
            error: 'Unauthorized: Valid admin authentication token is required.',
          });
        }
        // Verify role in profiles table
        const { data: profData } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', authUser.user.id)
          .maybeSingle();

        if (profData && profData.role !== 'admin' && profData.role !== 'superadmin') {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Only administrators are authorized to provision agents.',
          });
        }
      }
    }

    let userId: string | null = null;

    if (supabaseAdmin) {
      // Create user with email_confirm: true so NO verification email is ever sent!
      const { data: createdUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: cleanPassword,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: 'agent',
          team: cleanTeam,
        },
      });

      if (createErr) {
        // If already registered, update password and ensure email is confirmed
        if (
          createErr.message.toLowerCase().includes('already registered') ||
          createErr.message.toLowerCase().includes('already exists')
        ) {
          const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
          const existing = listData?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
          if (existing) {
            userId = existing.id;
            const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
              password: cleanPassword,
              email_confirm: true,
              user_metadata: {
                full_name: cleanName,
                role: 'agent',
                team: cleanTeam,
              },
            });
            if (updateErr) {
              return res.status(400).json({ success: false, error: updateErr.message });
            }
          } else {
            return res.status(400).json({ success: false, error: createErr.message });
          }
        } else {
          return res.status(400).json({ success: false, error: createErr.message });
        }
      } else {
        userId = createdUser.user.id;
      }

      // Upsert profile with role = 'agent' and is_active = true
      await supabaseAdmin.from('profiles').upsert({
        id: userId,
        email: cleanEmail,
        full_name: cleanName,
        role: 'agent',
        is_active: true,
        team: cleanTeam,
        updated_at: new Date().toISOString(),
      });

      // Insert welcome notification
      try {
        await supabaseAdmin.from('notifications').insert({
          id: `notif-welcome-${userId}-${Date.now()}`,
          agent_id: userId,
          title: 'Welcome to ProcessHub QA Portal',
          message: 'Your agent account has been provisioned by QA Administration. You can log in directly with your registered email and password.',
          created_at: new Date().toISOString(),
          read: false,
        });
      } catch {
        // Notification insertion failure is non-blocking
      }

      return res.status(200).json({
        success: true,
        userId,
        message: 'Agent created successfully with auto-confirmed credentials.',
      });
    }

    // If supabaseAdmin is not initialized, do NOT call auth.signUp()
    // Calling auth.signUp() triggers verification emails and Supabase's email rate limit (3/hr),
    // which violates the requirement: "Do NOT send verification emails to newly created agents."
    return res.status(400).json({
      success: false,
      error:
        'Provisioning agent accounts requires deploying the Supabase Edge Function "create-agent" or configuring SUPABASE_SECRET_KEYS.',
    });
  } catch (err: any) {
    console.error('Error in handleCreateAgent:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Server error while creating agent.',
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API endpoints
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasAdminKey: !!getAdminSecretKey(),
      supabaseUrl: getSupabaseUrl(),
    });
  });

  // Provision Agent endpoint - compatible with /api/admin/create-agent and Edge function /functions/v1/create-agent
  app.post('/api/admin/create-agent', handleCreateAgent);
  app.post('/functions/v1/create-agent', handleCreateAgent);

  // Vite integration: middleware in development, static in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ProcessHub server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
