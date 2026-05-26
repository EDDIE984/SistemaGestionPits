import type { IslandSignal, OrderStatus, TaskStatus } from '@/app/types';

export function formatDateTime(value?: string) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function orderStatusLabel(status: OrderStatus) {
  const labels: Record<OrderStatus, string> = {
    INGRESADA: 'Ingresada',
    LEVANTAMIENTO_PROFORMA: 'Proforma',
    GESTION_ASEGURADORA: 'Aseguradora',
    COMPRA_REPUESTO: 'Repuestos',
    PLANIFICACION_REPARACION: 'Planificacion',
    INICIO_REPARACION: 'Inicio reparacion',
    EN_PROCESO_ISLAS: 'En islas',
    CONTROL_CALIDAD: 'Calidad',
    LISTO_ENTREGA: 'Listo entrega',
    ENTREGADO: 'Entregado',
  };
  return labels[status];
}

export function taskStatusLabel(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    PENDIENTE: 'Pendiente',
    EN_PROCESO: 'En proceso',
    PAUSADA: 'Pausada',
    COMPLETADA: 'Completada',
  };
  return labels[status];
}

export function signalLabel(signal: IslandSignal) {
  const labels: Record<IslandSignal, string> = {
    'a-tiempo': 'A tiempo',
    'por-vencer': 'Por vencer',
    atrasado: 'Atrasado',
    proximo: 'Proximo',
  };
  return labels[signal];
}

export function signalClasses(signal: IslandSignal) {
  const classes: Record<IslandSignal, string> = {
    'a-tiempo': 'border-green-200 bg-green-50 text-green-800',
    'por-vencer': 'border-yellow-200 bg-yellow-50 text-yellow-800',
    atrasado: 'border-red-200 bg-red-50 text-red-800',
    proximo: 'border-blue-200 bg-blue-50 text-blue-800',
  };
  return classes[signal];
}

export function statusBadgeClasses(status: OrderStatus) {
  if (status === 'ENTREGADO') return 'bg-green-100 text-green-800';
  if (status === 'CONTROL_CALIDAD' || status === 'LISTO_ENTREGA') return 'bg-cyan-100 text-cyan-800';
  if (status === 'EN_PROCESO_ISLAS' || status === 'INICIO_REPARACION') return 'bg-blue-100 text-blue-800';
  if (status === 'COMPRA_REPUESTO' || status === 'GESTION_ASEGURADORA') return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-800';
}
