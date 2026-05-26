import { supabase } from '@/app/lib/supabase';

export interface SucursalOption {
  id: string;
  nombre: string;
  ciudad: string;
}

export interface AseguradoraOption {
  id: string;
  nombre: string;
}

export interface IslaOption {
  id: string;
  nombre: string;
}

export async function fetchSucursales(): Promise<SucursalOption[]> {
  const { data, error } = await supabase
    .from('sucursales')
    .select('id, nombre, ciudad')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as SucursalOption[];
}

export async function fetchAseguradoras(): Promise<AseguradoraOption[]> {
  const { data, error } = await supabase
    .from('aseguradoras')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as AseguradoraOption[];
}

export async function fetchIslas(sucursalId: string): Promise<IslaOption[]> {
  const { data, error } = await supabase
    .from('islas')
    .select('id, nombre')
    .eq('sucursal_id', sucursalId)
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as IslaOption[];
}
