import { createClient } from '@supabase/supabase-js';

export function sendJson(response: any, status: number, body: unknown) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.status(status).json(body);
}

export function handleOptions(request: any, response: any) {
  if (request.method !== 'OPTIONS') return false;
  sendJson(response, 200, { ok: true });
  return true;
}

export function parseBody<T>(body: unknown): T {
  if (typeof body === 'string') return JSON.parse(body) as T;
  return body as T;
}

export function createSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Falta configurar SUPABASE_URL o VITE_SUPABASE_URL');
  }

  if (!serviceRoleKey) {
    throw new Error('Falta configurar SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
