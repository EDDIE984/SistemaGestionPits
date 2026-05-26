import { supabase } from '@/app/lib/supabase';
import type { OrderStatus, SessionUser, WorkshopOrder } from '@/app/types';

function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('pits_session_user');
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

const progressByStatus: Record<OrderStatus, number> = {
  INGRESADA: 0,
  LEVANTAMIENTO_PROFORMA: 12,
  GESTION_ASEGURADORA: 24,
  COMPRA_REPUESTO: 35,
  PLANIFICACION_REPARACION: 45,
  INICIO_REPARACION: 55,
  EN_PROCESO_ISLAS: 68,
  CONTROL_CALIDAD: 86,
  LISTO_ENTREGA: 96,
  ENTREGADO: 100,
};

export async function fetchOrders(): Promise<WorkshopOrder[]> {
  const { data, error } = await supabase
    .from('ordenes')
    .select(`
      id,
      numero_orden,
      estado,
      fecha_ingreso,
      fecha_entrega_estimada,
      sucursales!inner(nombre),
      vehiculos!inner(placa, marca, modelo),
      clientes!inner(nombre),
      asesor:usuarios!asesor_id(nombre),
      aseguradoras(nombre)
    `)
    .order('fecha_ingreso', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const suc = r['sucursales'] as { nombre: string } | null;
    const veh = r['vehiculos'] as { placa: string; marca: string; modelo: string } | null;
    const cli = r['clientes'] as { nombre: string } | null;
    const ase = r['asesor'] as { nombre: string } | null;
    const seg = r['aseguradoras'] as { nombre: string } | null;
    const estado = r['estado'] as OrderStatus;

    return {
      id: r['id'] as string,
      numero_orden: r['numero_orden'] as string,
      estado,
      sucursal: suc?.nombre ?? '',
      placa: veh?.placa ?? '',
      marca: veh?.marca ?? '',
      modelo: veh?.modelo ?? '',
      cliente: cli?.nombre ?? '',
      asesor: ase?.nombre ?? '',
      aseguradora: seg?.nombre ?? undefined,
      fecha_ingreso: r['fecha_ingreso'] as string,
      fecha_entrega_estimada: (r['fecha_entrega_estimada'] as string | null) ?? undefined,
      progreso: progressByStatus[estado] ?? 0,
    } satisfies WorkshopOrder;
  });
}

export async function createOrder(input: {
  sucursal_id: string;
  aseguradora_id?: string | null;
  cedula?: string;
  nombre: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  ciudad?: string;
  placa: string;
  marca?: string;
  modelo?: string;
  chasis?: string;
  motor?: string;
  observaciones?: string;
}): Promise<string> {
  const session = getSession();
  if (!session) throw new Error('Sesion no encontrada');

  // Find or create client
  let clienteId: string;
  if (input.cedula) {
    const { data: existing } = await supabase
      .from('clientes')
      .select('id')
      .eq('cedula_ruc', input.cedula)
      .maybeSingle();
    if (existing) {
      clienteId = (existing as { id: string }).id;
    } else {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          cedula_ruc: input.cedula,
          nombre: input.nombre,
          telefono: input.telefono || null,
          correo: input.correo || null,
          direccion: input.direccion || null,
          ciudad: input.ciudad || null,
        })
        .select('id')
        .single();
      if (error) throw error;
      clienteId = (data as { id: string }).id;
    }
  } else {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nombre: input.nombre,
        telefono: input.telefono || null,
        correo: input.correo || null,
        direccion: input.direccion || null,
        ciudad: input.ciudad || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    clienteId = (data as { id: string }).id;
  }

  // Find or create vehicle
  let vehiculoId: string;
  const placa = input.placa.trim().toUpperCase();
  const { data: existingVehicle } = await supabase
    .from('vehiculos')
    .select('id')
    .eq('placa', placa)
    .maybeSingle();
  if (existingVehicle) {
    vehiculoId = (existingVehicle as { id: string }).id;
  } else {
    const { data, error } = await supabase
      .from('vehiculos')
      .insert({
        cliente_id: clienteId,
        placa,
        marca: input.marca || null,
        modelo: input.modelo || null,
        chasis: input.chasis || null,
        motor: input.motor || null,
      })
      .select('id')
      .single();
    if (error) throw error;
    vehiculoId = (data as { id: string }).id;
  }

  // Get asesor DB id
  const { data: asesorData } = await supabase
    .from('usuarios')
    .select('id')
    .eq('username', session.username)
    .single();
  const asesorId = asesorData ? (asesorData as { id: string }).id : session.id;

  // Generate order number
  const year = new Date().getFullYear();
  const { data: lastOrder } = await supabase
    .from('ordenes')
    .select('numero_orden')
    .ilike('numero_orden', `OT-${year}-%`)
    .order('numero_orden', { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastNum = lastOrder
    ? parseInt(((lastOrder as { numero_orden: string }).numero_orden).split('-')[2], 10)
    : 0;
  const numeroOrden = `OT-${year}-${String(lastNum + 1).padStart(4, '0')}`;

  // Create order
  const { data: newOrder, error: orderError } = await supabase
    .from('ordenes')
    .insert({
      sucursal_id: input.sucursal_id,
      vehiculo_id: vehiculoId,
      cliente_id: clienteId,
      asesor_id: asesorId,
      aseguradora_id: input.aseguradora_id || null,
      numero_orden: numeroOrden,
      estado: 'INGRESADA',
      observaciones: input.observaciones || null,
    })
    .select('id')
    .single();

  if (orderError) throw orderError;
  return (newOrder as { id: string }).id;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  observacion = ''
): Promise<void> {
  const session = getSession();

  const { data: current } = await supabase
    .from('ordenes')
    .select('estado')
    .eq('id', orderId)
    .single();

  const previousStatus = current ? (current as { estado: string }).estado : null;

  await supabase.from('ordenes').update({ estado: status }).eq('id', orderId);

  if (session && previousStatus && previousStatus !== status) {
    await supabase.from('orden_estados_historial').insert({
      orden_id: orderId,
      usuario_id: session.id,
      estado_anterior: previousStatus,
      estado_nuevo: status,
      observacion: observacion || null,
    });
  }
}
