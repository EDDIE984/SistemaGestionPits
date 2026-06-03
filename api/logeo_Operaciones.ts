import { createSupabaseAdmin, handleOptions, parseBody, sendJson } from './_supabase';

interface LoginRequest {
  username?: string;
  usuario?: string;
  password?: string;
  clave?: string;
}

interface LoginRow {
  id: string;
  nombre: string;
  username: string;
  rol: string;
  sucursal_id: string;
  sucursal_nombre: string;
  isla_id: string | null;
  isla_nombre: string | null;
}

interface TecnicoRow {
  id: string;
  isla_principal_id: string | null;
}

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;

  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Metodo no permitido' });
    return;
  }

  try {
    const body = parseBody<LoginRequest>(request.body);
    const username = (body.username || body.usuario || '').trim();
    const password = body.password || body.clave || '';

    if (!username || !password) {
      sendJson(response, 400, { ok: false, error: 'Usuario y clave son requeridos' });
      return;
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc('validate_credentials', {
      p_username: username,
      p_password: password,
    });

    if (error) throw error;

    const user = ((data ?? []) as LoginRow[])[0];
    if (!user) {
      sendJson(response, 401, { ok: false, error: 'Credenciales invalidas' });
      return;
    }

    if (user.rol !== 'OPERARIO') {
      sendJson(response, 403, { ok: false, error: 'El usuario no tiene perfil OPERARIO' });
      return;
    }

    const { data: tecnicoData, error: tecnicoError } = await supabase
      .from('tecnicos')
      .select('id, isla_principal_id')
      .eq('usuario_id', user.id)
      .eq('activo', true)
      .maybeSingle();

    if (tecnicoError) throw tecnicoError;

    const tecnico = tecnicoData as TecnicoRow | null;
    const islaId = user.isla_id || tecnico?.isla_principal_id || null;

    sendJson(response, 200, {
      ok: true,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        perfil: user.rol,
        sucursal: {
          id: user.sucursal_id,
          nombre: user.sucursal_nombre,
        },
        isla: {
          id: islaId,
          nombre: user.isla_nombre,
        },
        tecnico_id: tecnico?.id ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    sendJson(response, 500, { ok: false, error: message });
  }
}
