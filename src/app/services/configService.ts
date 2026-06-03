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
  sucursal_id?: string;
}

export interface TecnicoOption {
  id: string;
  nombre: string;
  sucursal_id: string;
  isla_principal_id: string | null;
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
    .select('id, nombre, sucursal_id')
    .eq('sucursal_id', sucursalId)
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as IslaOption[];
}

export async function fetchAllIslas(): Promise<IslaOption[]> {
  const { data, error } = await supabase
    .from('islas')
    .select('id, nombre, sucursal_id')
    .eq('activo', true)
    .order('nombre');
  if (error) throw error;
  return (data ?? []) as IslaOption[];
}

export async function fetchTecnicosByIsla(sucursalId: string, islaId: string): Promise<TecnicoOption[]> {
  const { data, error } = await supabase
    .from('tecnicos')
    .select('id, sucursal_id, isla_principal_id, usuarios(nombre)')
    .eq('sucursal_id', sucursalId)
    .eq('isla_principal_id', islaId)
    .eq('activo', true);
  if (error) throw error;

  return ((data ?? []) as Array<{
    id: string;
    sucursal_id: string;
    isla_principal_id: string | null;
    usuarios?: { nombre?: string | null } | null;
  }>)
    .map((row) => ({
      id: row.id,
      nombre: row.usuarios?.nombre ?? row.id,
      sucursal_id: row.sucursal_id,
      isla_principal_id: row.isla_principal_id,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}
