import { useSyncExternalStore } from 'react';
import { fetchOrderProcess, saveOrderStep, emptyProcess as emptyProcessFromService } from '@/app/services/orderProcessService';
import { fetchOrders, createOrder, updateOrderStatus } from '@/app/services/ordersService';
import { executeIslandTask, modifyIslandTask } from '@/app/services/orderProcessService';
import { supabase } from '@/app/lib/supabase';
import type { OrderProcess, OrderStatus, WorkshopOrder } from '@/app/types';

// Re-export OrderProcess under the old name for backward compatibility
export type MockOrderProcess = OrderProcess;

// ── Orders store ─────────────────────────────────────────────────

let ordersCache: WorkshopOrder[] | null = null;
let ordersLoading = false;
const ordersListeners = new Set<() => void>();
const EMPTY_ORDERS: WorkshopOrder[] = [];

function emitOrdersChange() {
  ordersListeners.forEach((fn) => fn());
}

function getOrdersSnapshot(): WorkshopOrder[] {
  if (!ordersCache && !ordersLoading) {
    ordersLoading = true;
    fetchOrders()
      .then((data) => {
        ordersCache = data;
        ordersLoading = false;
        emitOrdersChange();
      })
      .catch(() => {
        ordersLoading = false;
        ordersCache = EMPTY_ORDERS;
        emitOrdersChange();
      });
  }
  return ordersCache ?? EMPTY_ORDERS;
}

export function useMockOrders(): WorkshopOrder[] {
  return useSyncExternalStore(
    (listener) => {
      ordersListeners.add(listener);
      return () => ordersListeners.delete(listener);
    },
    getOrdersSnapshot,
    () => []
  );
}

export function refreshOrders() {
  ordersCache = null;
  ordersLoading = false;
  getOrdersSnapshot();
}

export async function addMockOrder(input: {
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
  const id = await createOrder(input);
  ordersCache = null;
  ordersLoading = false;
  getOrdersSnapshot();
  return id;
}

export async function updateMockOrderStatus(
  id: string,
  status: OrderStatus,
  observacion = ''
): Promise<void> {
  await updateOrderStatus(id, status, observacion);
  ordersCache = null;
  ordersLoading = false;
  getOrdersSnapshot();
  // Also bust process cache for this order (status change may affect historial)
  delete processCache[id];
}

// ── Process store ─────────────────────────────────────────────────

const processCache: Record<string, OrderProcess> = {};
const processLoading = new Set<string>();
const processListeners = new Set<() => void>();

function emitProcessChange() {
  processListeners.forEach((fn) => fn());
}

function emptyProcess(): OrderProcess {
  return emptyProcessFromService();
}

function getProcessSnapshot(orderId: string): OrderProcess {
  if (!processCache[orderId] && !processLoading.has(orderId)) {
    processLoading.add(orderId);
    fetchOrderProcess(orderId)
      .then((data) => {
        processCache[orderId] = data;
        processLoading.delete(orderId);
        emitProcessChange();
      })
      .catch(() => {
        processLoading.delete(orderId);
        processCache[orderId] = emptyProcess();
        emitProcessChange();
      });
  }
  return processCache[orderId] ?? emptyProcess();
}

export function getMockOrderProcess(orderId: string): OrderProcess {
  return getProcessSnapshot(orderId);
}

export function useMockOrderProcess(orderId?: string): OrderProcess | null {
  return useSyncExternalStore(
    (listener) => {
      processListeners.add(listener);
      return () => processListeners.delete(listener);
    },
    () => (orderId ? getProcessSnapshot(orderId) : null),
    () => null
  );
}

export async function saveMockOrderProcess(
  orderId: string,
  process: OrderProcess,
  orderStatus?: OrderStatus
): Promise<void> {
  processCache[orderId] = process;
  emitProcessChange();

  if (orderStatus) {
    await saveOrderStep(orderId, orderStatus, process);
    // Refresh from DB to pick up assigned IDs
    processLoading.delete(orderId);
    delete processCache[orderId];
    getProcessSnapshot(orderId);
  }
}

// ── All processes (for island board + modifications) ──────────────

type ProcessesMap = Record<string, { tareas: OrderProcess['tareas'] }>;

const EMPTY_PROCESSES: ProcessesMap = {};
let processesCache: ProcessesMap | null = null;
let processesLoading = false;
const processesListeners = new Set<() => void>();

function emitProcessesChange() {
  processesListeners.forEach((fn) => fn());
}

async function loadAllProcesses(): Promise<void> {
  const { data, error } = await supabase
    .from('orden_isla_tareas')
    .select('id, orden_id, operacion_nombre, tecnico_nombre, tiempo_estandar_ajustado, tarifa_hora_aplicada, fecha_inicio_planificada, fecha_fin_planificada, estado, fecha_inicio_real, fecha_fin_real, motivo_ajuste, observaciones, islas!inner(nombre), orden_isla_tarea_eventos(accion, estado_resultante, fecha_hora, observacion)');

  if (error) {
    processesCache = {};
    return;
  }

  const map: ProcessesMap = {};
  for (const row of (data ?? [])) {
    const r = row as {
      id: string; orden_id: string; operacion_nombre: string | null; tecnico_nombre: string | null;
      tiempo_estandar_ajustado: number; tarifa_hora_aplicada: number;
      fecha_inicio_planificada: string; fecha_fin_planificada: string;
      estado: string; fecha_inicio_real: string | null; fecha_fin_real: string | null;
      motivo_ajuste: string | null; observaciones: string | null;
      islas: { nombre: string };
      orden_isla_tarea_eventos: Array<{ accion: string; estado_resultante: string; fecha_hora: string; observacion: string | null }>;
    };

    if (!map[r.orden_id]) {
      map[r.orden_id] = { tareas: [] };
    }

    map[r.orden_id].tareas.push({
      id: r.id,
      isla: r.islas?.nombre ?? '',
      operacion: r.operacion_nombre ?? '',
      tecnico: r.tecnico_nombre ?? '',
      tiempo_estandar_horas: Number(r.tiempo_estandar_ajustado),
      tarifa_hora: Number(r.tarifa_hora_aplicada),
      fecha_inicio_planificada: r.fecha_inicio_planificada,
      fecha_fin_planificada: r.fecha_fin_planificada,
      estado: r.estado as OrderProcess['tareas'][number]['estado'],
      fecha_inicio_real: r.fecha_inicio_real ?? undefined,
      fecha_fin_real: r.fecha_fin_real ?? undefined,
      motivo_ajuste: r.motivo_ajuste ?? undefined,
      eventos: (r.orden_isla_tarea_eventos ?? []).map((e) => ({
        accion: e.accion as 'INICIAR' | 'PAUSAR' | 'REANUDAR' | 'FINALIZAR',
        fecha_hora: e.fecha_hora,
        estado_resultante: e.estado_resultante as OrderProcess['tareas'][number]['estado'] & string,
        observacion: e.observacion ?? '',
      })),
      observaciones: r.observaciones ?? '',
    });
  }

  processesCache = map;
}

function getProcessesSnapshot(): ProcessesMap {
  if (!processesCache && !processesLoading) {
    processesLoading = true;
    loadAllProcesses()
      .then(() => {
        processesLoading = false;
        emitProcessesChange();
      })
      .catch(() => {
        processesLoading = false;
        processesCache = EMPTY_PROCESSES;
        emitProcessesChange();
      });
  }
  return processesCache ?? EMPTY_PROCESSES;
}

export function useMockOrderProcesses(): ProcessesMap {
  return useSyncExternalStore(
    (listener) => {
      processesListeners.add(listener);
      return () => processesListeners.delete(listener);
    },
    getProcessesSnapshot,
    () => EMPTY_PROCESSES
  );
}

export function getMockOrderProcessesSnapshot(): ProcessesMap {
  return getProcessesSnapshot();
}

export function refreshProcesses() {
  processesCache = null;
  processesLoading = false;
  getProcessesSnapshot();
}

// ── Island task actions ───────────────────────────────────────────

export async function updateMockIslandTask(
  orderId: string,
  taskId: string,
  action: 'INICIAR' | 'PAUSAR' | 'FINALIZAR'
): Promise<void> {
  await executeIslandTask(taskId, action, orderId);
  // Refresh affected caches
  processesCache = null;
  processesLoading = false;
  delete processCache[orderId];
  getProcessesSnapshot();
  getProcessSnapshot(orderId);
  // Refresh orders in case status changed (all tasks done → CONTROL_CALIDAD)
  if (action === 'FINALIZAR') {
    ordersCache = null;
    ordersLoading = false;
    getOrdersSnapshot();
  }
}

export async function modifyMockIslandTask(
  orderId: string,
  taskId: string,
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
  await modifyIslandTask(taskId, changes);
  processesCache = null;
  processesLoading = false;
  delete processCache[orderId];
  getProcessesSnapshot();
  getProcessSnapshot(orderId);
}
