// Supabase Edge Function: create-agent
// Provisions agent accounts using the built-in SUPABASE_SECRET_KEYS configuration.
// Automatically marks email as confirmed (email_confirm: true) so agents
// never receive an email verification request and can log in directly with their email & password.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const adminKey = secretKeys["default"];

    if (!supabaseUrl || !adminKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'SUPABASE_URL and SUPABASE_SECRET_KEYS must be configured on the server.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { email, password, fullName, team = 'Escalations Squad', role = 'QA Support Associate' } = body;

    if (!email || !password || !fullName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Full name, email, and password are required to create an agent.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize privileged Supabase Admin client with the default secret key
    const supabaseAdmin = createClient(supabaseUrl, adminKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Verify that the caller is an authenticated Admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing admin bearer token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid or expired admin session token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller has admin role in profiles or user metadata
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .maybeSingle();

    const callerRole = (profileData?.role || userData.user.user_metadata?.role || '').toLowerCase();
    if (callerRole !== 'admin' && callerRole !== 'superadmin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: Only administrators can create agents.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    // 2. Create the agent using Supabase Auth Admin API with email_confirm: true
    let userId: string;

    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        role: 'agent',
        team: team,
        active: true,
        is_active: true,
      },
    });

    if (createError) {
      // If user already registered in auth, update password and ensure email is confirmed
      if (
        createError.message.toLowerCase().includes('already registered') ||
        createError.message.toLowerCase().includes('already exists')
      ) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);

        if (existing) {
          userId = existing.id;
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: password,
            email_confirm: true,
            user_metadata: {
              full_name: cleanName,
              role: 'agent',
              team: team,
              active: true,
              is_active: true,
            },
          });
          if (updateError) {
            return new Response(
              JSON.stringify({ success: false, error: updateError.message }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ success: false, error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ success: false, error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      userId = createData.user.id;
    }

    // 3. Create or update the agent profile with role = "agent" and active = true
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      email: cleanEmail,
      full_name: cleanName,
      role: 'agent',
      is_active: true,
      team: team,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.warn('Profile upsert note in Edge function:', profileError.message);
    }

    // 4. Return clear success response
    return new Response(
      JSON.stringify({
        success: true,
        userId: userId,
        message: 'Agent created successfully with auto-confirmed email.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Server error creating agent' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
