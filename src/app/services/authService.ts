import { supabase } from '@/app/lib/supabase';
import type { RoleName, SessionUser } from '@/app/types';

export async function validateAndLogin(username: string, password: string): Promise<SessionUser | null> {
  const { data, error } = await supabase.rpc('validate_credentials', {
    p_username: username.trim(),
    p_password: password,
  });

  if (error || !data || (data as unknown[]).length === 0) return null;

  const row = (data as {
    id: string;
    nombre: string;
    username: string;
    rol: string;
    sucursal_id: string;
    sucursal_nombre: string;
  }[])[0];

  return {
    id: row.id,
    nombre: row.nombre,
    username: row.username,
    rol: row.rol as RoleName,
    sucursal_id: row.sucursal_id,
    sucursal_nombre: row.sucursal_nombre,
  };
}
