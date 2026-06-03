function sendJson(response: any, status: number, body: unknown) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.status(status).json(body);
}

function handleOptions(request: any, response: any) {
  if (request.method !== 'OPTIONS') return false;
  sendJson(response, 200, { ok: true });
  return true;
}

function getSupabaseEnvStatus() {
  return {
    hasSupabaseUrl: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL),
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  };
}

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
