import { supabase } from '@/app/lib/supabase';
import { updateOrderStatus } from '@/app/services/ordersService';
import type { OrderProcess, OrderStatus, SessionUser } from '@/app/types';

function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('pits_session_user');
  return raw ? (JSON.parse(raw) as SessionUser) : null;
}

function emptyProcess(): OrderProcess {
  return {
    proforma: [],
    aseguradora: {
      aplica_aseguradora: false,
      estado: 'NO_APLICA',
      fecha_envio: '',
      fecha_aprobacion: '',
      observaciones: '',
      documento_url: '',
    },
    repuestos: [],
    tareas: [],
    calidad: {
      resultado: 'APROBADO',
      punto_control: 'Revision visual final',
      punto_resultado: 'APROBADO',
      observaciones: '',
      foto_url: '',
    },
    entrega: {
      fecha_notificacion_cliente: '',
      fecha_entrega_real: '',
      observaciones: '',
      foto_url: '',
      confirmada: false,
    },
    historial: [],
  };
}

export { emptyProcess };

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

async function findIslandIdByName(name: string, sucursalId: string) {
  const { data } = await supabase
    .from('islas')
    .select('id, nombre')
    .eq('sucursal_id', sucursalId)
    .eq('activo', true);

  const normalizedName = normalizeText(name);
  const match = (data ?? []).find((row) => normalizeText((row as { nombre: string }).nombre) === normalizedName);
  return match ? (match as { id: string }).id : null;
}

export async function fetchOrderProcess(orderId: string): Promise<OrderProcess> {
  const [
    proformaResult,
    aseguradoraResult,
    repuestosResult,
    tareasResult,
    calidadResult,
    entregaResult,
    historialResult,
  ] = await Promise.all([
    supabase.from('orden_piezas_danos').select('*').eq('orden_id', orderId).order('created_at'),
    supabase
      .from('orden_gestion_aseguradora')
      .select('*')
      .eq('orden_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('orden_repuestos').select('*').eq('orden_id', orderId).order('created_at'),
    supabase
      .from('orden_isla_tareas')
      .select('*, islas!inner(nombre), orden_isla_tarea_eventos(accion, estado_resultante, fecha_hora, observacion)')
      .eq('orden_id', orderId)
      .order('created_at'),
    supabase
      .from('orden_calidad_revision')
      .select('*')
      .eq('orden_id', orderId)
      .order('fecha_revision', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('orden_entrega').select('*').eq('orden_id', orderId).maybeSingle(),
    supabase
      .from('orden_eventos_historial')
      .select('*')
      .eq('orden_id', orderId)
      .order('fecha_hora'),
  ]);

  const empty = emptyProcess();

  type PiezaRow = {
    id: string; pieza: string; categoria_dano: string;
    observacion: string | null; requiere_reemplazo: boolean; costo_estimado: number | null;
  };
  type AsegRow = {
    id: string; aplica_aseguradora: boolean; estado: string;
    fecha_envio: string | null; fecha_aprobacion: string | null; observaciones: string | null;
  };
  type RepRow = {
    id: string; descripcion_libre: string | null; cantidad: number;
    estado: string; proveedor: string | null; fecha_estimada_llegada: string | null;
    fecha_real_llegada: string | null; costo: number | null; observaciones: string | null;
  };
  type EventoRow = { accion: string; estado_resultante: string; fecha_hora: string; observacion: string | null };
  type TareaRow = {
    id: string; operacion_nombre: string | null; tecnico_nombre: string | null;
    tiempo_estandar_ajustado: number; tarifa_hora_aplicada: number;
    fecha_inicio_planificada: string; fecha_fin_planificada: string;
    estado: string; fecha_inicio_real: string | null; fecha_fin_real: string | null;
    motivo_ajuste: string | null; observaciones: string | null;
    islas: { nombre: string };
    orden_isla_tarea_eventos: EventoRow[];
  };
  type CalRow = { id: string; resultado: string; observaciones_generales: string | null };
  type EntRow = {
    id: string; fecha_notificacion_cliente: string | null;
    fecha_entrega_real: string | null; observaciones: string | null;
  };
  type HistRow = {
    id: string; tipo_evento: string; estado_actual: string | null;
    fecha_hora: string; titulo: string | null; detalle: string | null; datos_snapshot: unknown;
  };

  return {
    proforma: ((proformaResult.data ?? []) as PiezaRow[]).map((p) => ({
      id: p.id,
      pieza: p.pieza,
      categoria_dano: p.categoria_dano,
      observacion: p.observacion ?? '',
      requiere_reemplazo: p.requiere_reemplazo,
      costo_estimado: Number(p.costo_estimado ?? 0),
      foto_url: '',
    })),
    aseguradora: aseguradoraResult.data
      ? {
        id: (aseguradoraResult.data as AsegRow).id,
        aplica_aseguradora: (aseguradoraResult.data as AsegRow).aplica_aseguradora,
        estado: (aseguradoraResult.data as AsegRow).estado,
        fecha_envio: (aseguradoraResult.data as AsegRow).fecha_envio ?? '',
        fecha_aprobacion: (aseguradoraResult.data as AsegRow).fecha_aprobacion ?? '',
        observaciones: (aseguradoraResult.data as AsegRow).observaciones ?? '',
        documento_url: '',
      }
      : empty.aseguradora,
    repuestos: ((repuestosResult.data ?? []) as RepRow[]).map((r) => ({
      id: r.id,
      descripcion: r.descripcion_libre ?? '',
      cantidad: Number(r.cantidad),
      estado: r.estado,
      proveedor: r.proveedor ?? '',
      fecha_estimada_llegada: r.fecha_estimada_llegada ?? '',
      fecha_real_llegada: r.fecha_real_llegada ?? '',
      costo: Number(r.costo ?? 0),
      observaciones: r.observaciones ?? '',
    })),
    tareas: ((tareasResult.data ?? []) as TareaRow[]).map((t) => ({
      id: t.id,
      isla: t.islas?.nombre ?? '',
      operacion: t.operacion_nombre ?? '',
      tecnico: t.tecnico_nombre ?? '',
      tiempo_estandar_horas: Number(t.tiempo_estandar_ajustado),
      tarifa_hora: Number(t.tarifa_hora_aplicada),
      fecha_inicio_planificada: t.fecha_inicio_planificada,
      fecha_fin_planificada: t.fecha_fin_planificada,
      estado: t.estado as 'PENDIENTE' | 'EN_PROCESO' | 'PAUSADA' | 'COMPLETADA',
      fecha_inicio_real: t.fecha_inicio_real ?? undefined,
      fecha_fin_real: t.fecha_fin_real ?? undefined,
      motivo_ajuste: t.motivo_ajuste ?? undefined,
      eventos: (t.orden_isla_tarea_eventos ?? []).map((e) => ({
        accion: e.accion as 'INICIAR' | 'PAUSAR' | 'REANUDAR' | 'FINALIZAR',
        fecha_hora: e.fecha_hora,
        estado_resultante: e.estado_resultante as 'PENDIENTE' | 'EN_PROCESO' | 'PAUSADA' | 'COMPLETADA',
        observacion: e.observacion ?? '',
      })),
      observaciones: t.observaciones ?? '',
    })),
    calidad: calidadResult.data
      ? {
        id: (calidadResult.data as CalRow).id,
        resultado: (calidadResult.data as CalRow).resultado,
        punto_control: '',
        punto_resultado: 'APROBADO',
        observaciones: (calidadResult.data as CalRow).observaciones_generales ?? '',
        foto_url: '',
      }
      : empty.calidad,
    entrega: entregaResult.data
      ? {
        id: (entregaResult.data as EntRow).id,
        fecha_notificacion_cliente: (entregaResult.data as EntRow).fecha_notificacion_cliente ?? '',
        fecha_entrega_real: (entregaResult.data as EntRow).fecha_entrega_real ?? '',
        observaciones: (entregaResult.data as EntRow).observaciones ?? '',
        foto_url: '',
        confirmada: Boolean((entregaResult.data as EntRow).fecha_entrega_real),
      }
      : empty.entrega,
    historial: ((historialResult.data ?? []) as HistRow[]).map((h) => ({
      id: h.id,
      tipo: h.tipo_evento as 'DATOS_GUARDADOS' | 'CAMBIO_ESTADO',
      estado_actual: (h.estado_actual as OrderStatus) ?? undefined,
      fecha_hora: h.fecha_hora,
      titulo: h.titulo ?? undefined,
      detalle: h.detalle ?? '',
      observacion: h.detalle ?? '',
      datos: h.datos_snapshot,
    })),
  };
}

export async function saveOrderStep(
  orderId: string,
  orderStatus: OrderStatus,
  process: OrderProcess
): Promise<void> {
  const session = getSession();

  switch (orderStatus) {
    case 'LEVANTAMIENTO_PROFORMA': {
      const last = process.proforma.at(-1);
      if (!last) break;
      if (last.id) {
        await supabase.from('orden_piezas_danos').update({
          pieza: last.pieza,
          categoria_dano: last.categoria_dano,
          observacion: last.observacion || null,
          requiere_reemplazo: last.requiere_reemplazo,
          costo_estimado: last.costo_estimado || null,
        }).eq('id', last.id);
      } else {
        const { data } = await supabase.from('orden_piezas_danos').insert({
          orden_id: orderId,
          pieza: last.pieza,
          categoria_dano: last.categoria_dano,
          observacion: last.observacion || null,
          requiere_reemplazo: last.requiere_reemplazo,
          costo_estimado: last.costo_estimado || null,
        }).select('id').single();
        if (data) last.id = (data as { id: string }).id;
      }
      break;
    }

    case 'GESTION_ASEGURADORA': {
      if (!session) break;
      const a = process.aseguradora;
      if (a.id) {
        await supabase.from('orden_gestion_aseguradora').update({
          aplica_aseguradora: a.aplica_aseguradora,
          estado: a.estado,
          fecha_envio: a.fecha_envio || null,
          fecha_aprobacion: a.fecha_aprobacion || null,
          observaciones: a.observaciones || null,
        }).eq('id', a.id);
      } else {
        const { data } = await supabase.from('orden_gestion_aseguradora').insert({
          orden_id: orderId,
          usuario_id: session.id,
          aplica_aseguradora: a.aplica_aseguradora,
          estado: a.estado,
          fecha_envio: a.fecha_envio || null,
          fecha_aprobacion: a.fecha_aprobacion || null,
          observaciones: a.observaciones || null,
        }).select('id').single();
        if (data) a.id = (data as { id: string }).id;
      }
      break;
    }

    case 'COMPRA_REPUESTO': {
      const last = process.repuestos.at(-1);
      if (!last) break;
      if (last.id) {
        await supabase.from('orden_repuestos').update({
          descripcion_libre: last.descripcion || null,
          cantidad: last.cantidad,
          estado: last.estado,
          proveedor: last.proveedor || null,
          fecha_estimada_llegada: last.fecha_estimada_llegada || null,
          fecha_real_llegada: last.fecha_real_llegada || null,
          costo: last.costo || null,
          observaciones: last.observaciones || null,
        }).eq('id', last.id);
      } else {
        const { data } = await supabase.from('orden_repuestos').insert({
          orden_id: orderId,
          descripcion_libre: last.descripcion || null,
          cantidad: last.cantidad,
          estado: last.estado,
          proveedor: last.proveedor || null,
          fecha_estimada_llegada: last.fecha_estimada_llegada || null,
          fecha_real_llegada: last.fecha_real_llegada || null,
          costo: last.costo || null,
          observaciones: last.observaciones || null,
        }).select('id').single();
        if (data) last.id = (data as { id: string }).id;
      }
      break;
    }

    case 'PLANIFICACION_REPARACION': {
      if (!session) break;

      for (const task of process.tareas) {
        if (!task.operacion?.trim()) continue;

        const islaId = await findIslandIdByName(task.isla, session.sucursal_id);
        if (!islaId) {
          throw new Error(`No se encontro la isla "${task.isla}" para la sucursal actual`);
        }

        const costoEstimado = task.tiempo_estandar_horas * task.tarifa_hora;
        const payload = {
          isla_id: islaId,
          operacion_nombre: task.operacion || null,
          tecnico_nombre: task.tecnico || null,
          tiempo_estandar_original: task.tiempo_estandar_horas,
          tiempo_estandar_ajustado: task.tiempo_estandar_horas,
          tarifa_hora_aplicada: task.tarifa_hora,
          costo_estimado: costoEstimado,
          fecha_inicio_planificada: task.fecha_inicio_planificada || new Date().toISOString(),
          fecha_fin_planificada: task.fecha_fin_planificada || new Date().toISOString(),
          motivo_ajuste: task.motivo_ajuste || null,
          observaciones: task.observaciones || null,
        };

        if (task.id) {
          await supabase.from('orden_isla_tareas').update(payload).eq('id', task.id);
        } else {
          const { data } = await supabase.from('orden_isla_tareas').insert({
            orden_id: orderId,
            ...payload,
            estado: 'PENDIENTE',
          }).select('id').single();
          if (data) task.id = (data as { id: string }).id;
        }
      }
      break;
    }

    case 'CONTROL_CALIDAD': {
      if (!session) break;
      const cal = process.calidad;
      if (cal.id) {
        await supabase.from('orden_calidad_revision').update({
          resultado: cal.resultado,
          observaciones_generales: cal.observaciones || null,
        }).eq('id', cal.id);
      } else {
        const { data } = await supabase.from('orden_calidad_revision').insert({
          orden_id: orderId,
          usuario_id: session.id,
          resultado: cal.resultado,
          observaciones_generales: cal.observaciones || null,
        }).select('id').single();
        if (data) cal.id = (data as { id: string }).id;
      }
      break;
    }

    case 'LISTO_ENTREGA':
    case 'ENTREGADO': {
      if (!session) break;
      const ent = process.entrega;
      if (ent.id) {
        await supabase.from('orden_entrega').update({
          fecha_notificacion_cliente: ent.fecha_notificacion_cliente || null,
          fecha_entrega_real: ent.fecha_entrega_real || null,
          observaciones: ent.observaciones || null,
        }).eq('id', ent.id);
      } else {
        const { data } = await supabase.from('orden_entrega').insert({
          orden_id: orderId,
          usuario_id: session.id,
          fecha_notificacion_cliente: ent.fecha_notificacion_cliente || null,
          fecha_entrega_real: ent.fecha_entrega_real || null,
          observaciones: ent.observaciones || null,
        }).select('id').single();
        if (data) ent.id = (data as { id: string }).id;
      }
      break;
    }

    default:
      break;
  }

  // Insert latest historial entry (the one just added by withHistoryEntry)
  const lastHistorial = process.historial.at(-1);
  if (lastHistorial && !lastHistorial.id && session) {
    await supabase.from('orden_eventos_historial').insert({
      orden_id: orderId,
      usuario_id: session.id,
      tipo_evento: lastHistorial.tipo ?? 'DATOS_GUARDADOS',
      estado_actual: lastHistorial.estado_actual ?? orderStatus,
      titulo: lastHistorial.titulo ?? '',
      detalle: lastHistorial.detalle ?? lastHistorial.observacion ?? '',
      fecha_hora: lastHistorial.fecha_hora,
      datos_snapshot: lastHistorial.datos ?? null,
    });
  }
}

export async function executeIslandTask(
  tareaId: string,
  action: 'INICIAR' | 'PAUSAR' | 'FINALIZAR',
  orderId: string
): Promise<void> {
  const session = getSession();
  const now = new Date().toISOString();

  const { data: current } = await supabase
    .from('orden_isla_tareas')
    .select('estado, fecha_inicio_real')
    .eq('id', tareaId)
    .single();

  if (!current) return;

  const currentState = (current as { estado: string; fecha_inicio_real: string | null });
  const isPaused = currentState.estado === 'PAUSADA';

  const eventAction = action === 'INICIAR' && isPaused ? 'REANUDAR' : action;
  const newEstado =
    action === 'INICIAR' ? 'EN_PROCESO' :
    action === 'PAUSAR' ? 'PAUSADA' : 'COMPLETADA';

  const updateData: Record<string, unknown> = { estado: newEstado };
  if (action === 'INICIAR' && !currentState.fecha_inicio_real) {
    updateData['fecha_inicio_real'] = now;
  }
  if (action === 'FINALIZAR') {
    updateData['fecha_fin_real'] = now;
  }

  await supabase.from('orden_isla_tareas').update(updateData).eq('id', tareaId);

  if (session) {
    await supabase.from('orden_isla_tarea_eventos').insert({
      tarea_id: tareaId,
      usuario_id: session.id,
      accion: eventAction,
      estado_resultante: newEstado,
      fecha_hora: now,
      observacion: `Tarea ${eventAction.toLowerCase()} por operario.`,
    });
  }

  // Auto-advance order when all tasks are done
  if (action === 'FINALIZAR') {
    const { data: tareas, error } = await supabase
      .from('orden_isla_tareas')
      .select('estado')
      .eq('orden_id', orderId);

    if (error) throw error;

    const taskStates = (tareas ?? []) as Array<{ estado: string }>;
    const allDone = taskStates.length > 0 && taskStates.every((t) => t.estado === 'COMPLETADA');

    if (allDone) {
      await updateOrderStatus(orderId, 'CONTROL_CALIDAD', 'Todas las tareas de isla fueron finalizadas.');
    }
  }
}

export async function modifyIslandTask(
  tareaId: string,
  changes: {
    tecnico: string;
    tiempo_estandar_horas: number;
    tarifa_hora: number;
    fecha_inicio_planificada: string;
    fecha_fin_planificada: string;
    motivo_ajuste: string;
    observaciones: string;
  }
): Promise<void> {
  await supabase.from('orden_isla_tareas').update({
    tecnico_nombre: changes.tecnico || null,
    tiempo_estandar_ajustado: changes.tiempo_estandar_horas,
    tarifa_hora_aplicada: changes.tarifa_hora,
    costo_estimado: changes.tiempo_estandar_horas * changes.tarifa_hora,
    fecha_inicio_planificada: changes.fecha_inicio_planificada || null,
    fecha_fin_planificada: changes.fecha_fin_planificada || null,
    motivo_ajuste: changes.motivo_ajuste || null,
    observaciones: changes.observaciones || null,
  }).eq('id', tareaId);
}
