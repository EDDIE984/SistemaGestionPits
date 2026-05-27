import { supabase } from '@/app/lib/supabase';
import type { OrderStatus } from '@/app/types';

interface NotificationRow {
  id: string;
  usuario_id: string | null;
  orden_id: string | null;
  tipo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
  ordenes?: {
    numero_orden: string;
    estado: OrderStatus;
    sucursal_id: string;
  } | Array<{
    numero_orden: string;
    estado: OrderStatus;
    sucursal_id: string;
  }> | null;
}

export interface NotificationItem {
  id: string;
  usuario_id: string | null;
  orden_id: string | null;
  tipo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
  orden?: {
    numero_orden: string;
    estado: OrderStatus;
    sucursal_id: string;
  };
}

function mapNotification(row: NotificationRow): NotificationItem {
  const order = Array.isArray(row.ordenes) ? row.ordenes[0] : row.ordenes;

  return {
    id: row.id,
    usuario_id: row.usuario_id,
    orden_id: row.orden_id,
    tipo: row.tipo,
    mensaje: row.mensaje,
    leida: row.leida,
    created_at: row.created_at,
    orden: order ? {
      numero_orden: order.numero_orden,
      estado: order.estado,
      sucursal_id: order.sucursal_id,
    } : undefined,
  };
}

export async function fetchNotifications(userId?: string, sucursalId?: string, includeAllUsers = false) {
  let query = supabase
    .from('notificaciones')
    .select('id, usuario_id, orden_id, tipo, mensaje, leida, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (!includeAllUsers) {
    query = userId
      ? query.or(`usuario_id.is.null,usuario_id.eq.${userId}`)
      : query.is('usuario_id', null);
  }

  const { data, error } = await query;

  if (error) throw error;

  const rows = (data ?? []) as NotificationRow[];
  const orderIds = Array.from(new Set(rows.map((row) => row.orden_id).filter(Boolean))) as string[];

  if (!orderIds.length) {
    return rows.map(mapNotification);
  }

  const { data: ordersData, error: ordersError } = await supabase
    .from('ordenes')
    .select('id, numero_orden, estado, sucursal_id')
    .in('id', orderIds);

  if (ordersError) throw ordersError;

  const ordersById = new Map((ordersData ?? []).map((order) => [
    (order as { id: string }).id,
    order as { numero_orden: string; estado: OrderStatus; sucursal_id: string },
  ]));

  return rows
    .map((row) => mapNotification({
      ...row,
      ordenes: row.orden_id ? ordersById.get(row.orden_id) ?? null : null,
    }))
    .filter((notification) => !sucursalId || !notification.orden || notification.orden.sucursal_id === sucursalId);
}

export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', notificationId);

  if (error) throw error;
}

export async function markNotificationsAsRead(notificationIds: string[]) {
  if (!notificationIds.length) return;

  const { error } = await supabase
    .from('notificaciones')
    .update({ leida: true })
    .in('id', notificationIds);

  if (error) throw error;
}
