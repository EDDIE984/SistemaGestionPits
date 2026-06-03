import { createSupabaseAdmin, handleOptions, parseBody, sendJson } from './_supabase';

type IslandAction = 'INICIAR' | 'PAUSAR' | 'REANUDAR' | 'FINALIZAR';
type TaskStatus = 'PENDIENTE' | 'EN_PROCESO' | 'PAUSADA' | 'COMPLETADA';
type OrderStatus = 'INGRESADA' | 'LEVANTAMIENTO_PROFORMA' | 'GESTION_ASEGURADORA' | 'COMPRA_REPUESTO' | 'PLANIFICACION_REPARACION' | 'INICIO_REPARACION' | 'EN_PROCESO_ISLAS' | 'CONTROL_CALIDAD' | 'LISTO_ENTREGA' | 'ENTREGADO';

interface OperationRequest {
  usuario_id?: string;
  tecnico_id?: string;
  numero_orden?: string;
  ot?: string;
  tarea_id?: string;
  accion?: string;
  operacion?: string;
  observacion?: string;
  motivo_pausa?: string;
}

interface UserRow {
  id: string;
  nombre: string;
  sucursal_id: string;
  isla_id: string | null;
  roles: { nombre: string } | null;
}

interface TecnicoRow {
  id: string;
  isla_principal_id: string | null;
}

interface OrderRow {
  id: string;
  numero_orden: string;
  estado: OrderStatus;
  sucursal_id: string;
}

interface TaskRow {
  id: string;
  orden_id: string;
  isla_id: string;
  tecnico_id: string | null;
  estado: TaskStatus;
  fecha_inicio_real: string | null;
  fecha_fin_real: string | null;
  operacion_nombre: string | null;
}

function normalizeAction(value?: string): IslandAction | null {
  const normalized = (value ?? '').trim().toUpperCase();
  if (['INICIAR', 'INICIO', 'START'].includes(normalized)) return 'INICIAR';
  if (['PAUSAR', 'PAUSA', 'PAUSE'].includes(normalized)) return 'PAUSAR';
  if (['REANUDAR', 'REANUDACION', 'REANUDACION_TRABAJO', 'RESUME'].includes(normalized)) return 'REANUDAR';
  if (['FINALIZAR', 'FINALIZACION', 'FIN', 'END'].includes(normalized)) return 'FINALIZAR';
  return null;
}

function getNextState(action: IslandAction): TaskStatus {
  if (action === 'PAUSAR') return 'PAUSADA';
  if (action === 'FINALIZAR') return 'COMPLETADA';
  return 'EN_PROCESO';
}

function validateTransition(current: TaskRow, action: IslandAction) {
  if (current.estado === 'COMPLETADA' || current.fecha_fin_real) {
    return 'La tarea ya esta completada';
  }

  if (action === 'PAUSAR' && current.estado !== 'EN_PROCESO') {
    return 'Solo se puede pausar una tarea en proceso';
  }

  if (action === 'REANUDAR' && current.estado !== 'PAUSADA') {
    return 'Solo se puede reanudar una tarea pausada';
  }

  if (action === 'INICIAR' && current.estado === 'EN_PROCESO') {
    return 'La tarea ya esta en proceso';
  }

  if (action === 'FINALIZAR' && current.estado !== 'EN_PROCESO') {
    return 'Solo se puede finalizar una tarea en proceso';
  }

  return null;
}

async function updateOrderStatus(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  order: OrderRow,
  usuarioId: string,
  nextStatus: OrderStatus,
  observacion: string,
) {
  if (order.estado === nextStatus) return order.estado;

  const previousStatus = order.estado;
  const { error: updateError } = await supabase
    .from('ordenes')
    .update({ estado: nextStatus })
    .eq('id', order.id);

  if (updateError) throw updateError;

  await supabase.from('orden_estados_historial').insert({
    orden_id: order.id,
    usuario_id: usuarioId,
    estado_anterior: previousStatus,
    estado_nuevo: nextStatus,
    observacion,
  });

  order.estado = nextStatus;
  return previousStatus;
}

async function findTask(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  input: {
    orderId?: string;
    tareaId?: string;
    islaId: string | null;
    tecnicoId: string | null;
  },
) {
  let query = supabase
    .from('orden_isla_tareas')
    .select('id, orden_id, isla_id, tecnico_id, estado, fecha_inicio_real, fecha_fin_real, operacion_nombre');

  if (input.tareaId) {
    query = query.eq('id', input.tareaId);
  } else if (input.orderId && input.islaId) {
    query = query.eq('orden_id', input.orderId);
    query = query.eq('isla_id', input.islaId);
  } else if (input.orderId && input.tecnicoId) {
    query = query.eq('orden_id', input.orderId);
    query = query.eq('tecnico_id', input.tecnicoId);
  } else if (input.orderId) {
    query = query.eq('orden_id', input.orderId);
  }

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;

  const tasks = (data ?? []) as TaskRow[];
  return tasks.find((task) => task.estado === 'EN_PROCESO')
    ?? tasks.find((task) => task.estado === 'PAUSADA')
    ?? tasks.find((task) => task.estado === 'PENDIENTE')
    ?? tasks[0]
    ?? null;
}

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;

  if (request.method !== 'POST') {
    sendJson(response, 405, { ok: false, error: 'Metodo no permitido' });
    return;
  }

  try {
    const body = parseBody<OperationRequest>(request.body);
    const usuarioId = body.usuario_id?.trim();
    const orderNumber = (body.numero_orden || body.ot || '').trim();
    const action = normalizeAction(body.accion || body.operacion);

    if (!usuarioId) {
      sendJson(response, 400, { ok: false, error: 'usuario_id es requerido' });
      return;
    }

    if (!orderNumber && !body.tarea_id) {
      sendJson(response, 400, { ok: false, error: 'numero_orden u ot es requerido' });
      return;
    }

    if (!action) {
      sendJson(response, 400, { ok: false, error: 'accion no valida. Use INICIAR, PAUSAR, REANUDAR o FINALIZAR' });
      return;
    }

    const supabase = createSupabaseAdmin();
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('id, nombre, sucursal_id, isla_id, roles(nombre)')
      .eq('id', usuarioId)
      .eq('activo', true)
      .maybeSingle();

    if (userError) throw userError;
    const user = userData as UserRow | null;

    if (!user) {
      sendJson(response, 401, { ok: false, error: 'Usuario no encontrado o inactivo' });
      return;
    }

    if (user.roles?.nombre !== 'OPERARIO') {
      sendJson(response, 403, { ok: false, error: 'El usuario no tiene perfil OPERARIO' });
      return;
    }

    const { data: tecnicoData, error: tecnicoError } = await supabase
      .from('tecnicos')
      .select('id, isla_principal_id')
      .eq('usuario_id', usuarioId)
      .eq('activo', true)
      .maybeSingle();

    if (tecnicoError) throw tecnicoError;

    const tecnico = tecnicoData as TecnicoRow | null;
    const tecnicoId = body.tecnico_id || tecnico?.id || null;
    const islaId = user.isla_id || tecnico?.isla_principal_id || null;

    if (!body.tarea_id && !islaId && !tecnicoId) {
      sendJson(response, 400, { ok: false, error: 'El operario no tiene isla o tecnico asignado' });
      return;
    }

    let order: OrderRow | null = null;
    if (orderNumber) {
      const { data: orderData, error: orderError } = await supabase
        .from('ordenes')
        .select('id, numero_orden, estado, sucursal_id')
        .eq('numero_orden', orderNumber)
        .maybeSingle();

      if (orderError) throw orderError;
      order = orderData as OrderRow | null;

      if (!order) {
        sendJson(response, 404, { ok: false, error: 'OT no encontrada' });
        return;
      }

      if (order.sucursal_id !== user.sucursal_id) {
        sendJson(response, 403, { ok: false, error: 'La OT no pertenece a la sucursal del operario' });
        return;
      }
    }

    const task = await findTask(supabase, {
      orderId: order?.id,
      tareaId: body.tarea_id,
      islaId,
      tecnicoId,
    });

    if (!task) {
      sendJson(response, 404, { ok: false, error: 'No hay tarea de isla para esta OT y operario' });
      return;
    }

    if (!order) {
      const { data: orderData, error: orderError } = await supabase
        .from('ordenes')
        .select('id, numero_orden, estado, sucursal_id')
        .eq('id', task.orden_id)
        .maybeSingle();

      if (orderError) throw orderError;
      order = orderData as OrderRow | null;
    }

    if (!order) {
      sendJson(response, 404, { ok: false, error: 'OT no encontrada para la tarea' });
      return;
    }

    if (order.sucursal_id !== user.sucursal_id) {
      sendJson(response, 403, { ok: false, error: 'La tarea no pertenece a la sucursal del operario' });
      return;
    }

    const canOperateTask = Boolean(
      body.tarea_id
        ? (islaId && task.isla_id === islaId) || (tecnicoId && task.tecnico_id === tecnicoId)
        : true,
    );

    if (!canOperateTask) {
      sendJson(response, 403, { ok: false, error: 'La tarea no pertenece a la isla o tecnico del operario' });
      return;
    }

    const effectiveAction: IslandAction = action === 'INICIAR' && task.estado === 'PAUSADA' ? 'REANUDAR' : action;
    const transitionError = validateTransition(task, effectiveAction);
    if (transitionError) {
      sendJson(response, 409, {
        ok: false,
        error: transitionError,
        tarea: {
          id: task.id,
          estado: task.estado,
        },
      });
      return;
    }

    const now = new Date().toISOString();
    const nextState = getNextState(effectiveAction);
    const updateData: Record<string, unknown> = { estado: nextState };

    if (!task.tecnico_id && tecnicoId) updateData.tecnico_id = tecnicoId;
    if (effectiveAction === 'INICIAR' && !task.fecha_inicio_real) updateData.fecha_inicio_real = now;
    if (effectiveAction === 'FINALIZAR') updateData.fecha_fin_real = now;

    const { error: updateError } = await supabase
      .from('orden_isla_tareas')
      .update(updateData)
      .eq('id', task.id);

    if (updateError) throw updateError;

    if (effectiveAction === 'PAUSAR') {
      const { error: pauseError } = await supabase.from('orden_isla_tarea_pausas').insert({
        tarea_id: task.id,
        inicio_pausa: now,
        motivo: body.motivo_pausa || body.observacion || null,
      });
      if (pauseError) throw pauseError;
    }

    if (effectiveAction === 'REANUDAR') {
      const { data: pauseRows, error: pauseLookupError } = await supabase
        .from('orden_isla_tarea_pausas')
        .select('id')
        .eq('tarea_id', task.id)
        .is('fin_pausa', null)
        .order('inicio_pausa', { ascending: false })
        .limit(1);

      if (pauseLookupError) throw pauseLookupError;

      const pauseId = (pauseRows as Array<{ id: string }> | null)?.[0]?.id;
      if (pauseId) {
        const { error: pauseUpdateError } = await supabase
          .from('orden_isla_tarea_pausas')
          .update({ fin_pausa: now })
          .eq('id', pauseId);

        if (pauseUpdateError) throw pauseUpdateError;
      }
    }

    const { data: eventData, error: eventError } = await supabase
      .from('orden_isla_tarea_eventos')
      .insert({
        tarea_id: task.id,
        usuario_id: usuarioId,
        tecnico_id: tecnicoId,
        accion: effectiveAction,
        estado_resultante: nextState,
        fecha_hora: now,
        observacion: body.observacion || `Tarea ${effectiveAction.toLowerCase()} por PDA.`,
      })
      .select('id')
      .single();

    if (eventError) throw eventError;

    if (effectiveAction === 'INICIAR' || effectiveAction === 'REANUDAR') {
      await updateOrderStatus(supabase, order, usuarioId, 'EN_PROCESO_ISLAS', `Tarea ${effectiveAction.toLowerCase()} en isla.`);
    }

    if (effectiveAction === 'FINALIZAR') {
      const { data: allTasks, error: tasksError } = await supabase
        .from('orden_isla_tareas')
        .select('estado')
        .eq('orden_id', order.id);

      if (tasksError) throw tasksError;

      const states = (allTasks ?? []) as Array<{ estado: TaskStatus }>;
      const allDone = states.length > 0 && states.every((item) => item.estado === 'COMPLETADA');
      if (allDone) {
        await updateOrderStatus(supabase, order, usuarioId, 'CONTROL_CALIDAD', 'Todas las tareas de isla fueron finalizadas.');
      }
    }

    sendJson(response, 200, {
      ok: true,
      operacion: {
        accion: effectiveAction,
        fecha_hora: now,
      },
      orden: {
        id: order.id,
        numero_orden: order.numero_orden,
        estado: order.estado,
      },
      tarea: {
        id: task.id,
        isla_id: task.isla_id,
        tecnico_id: tecnicoId,
        operacion_nombre: task.operacion_nombre,
        estado: nextState,
        evento_id: (eventData as { id: string }).id,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    sendJson(response, 500, { ok: false, error: message });
  }
}
