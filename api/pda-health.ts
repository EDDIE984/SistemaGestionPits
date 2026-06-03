import { getSupabaseEnvStatus, handleOptions, sendJson } from './_supabase';

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;

  if (request.method !== 'GET' && request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Metodo no permitido' });
    return;
  }

  const env = getSupabaseEnvStatus();

  sendJson(response, env.hasSupabaseUrl && env.hasServiceRoleKey ? 200 : 500, {
    ok: env.hasSupabaseUrl && env.hasServiceRoleKey,
    service: 'pda-webservices',
    env,
  });
}
