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
  const classes: Record<OrderStatus, string> = {
    INGRESADA:               'bg-sky-100 text-sky-700',
    LEVANTAMIENTO_PROFORMA:  'bg-violet-100 text-violet-700',
    GESTION_ASEGURADORA:     'bg-amber-100 text-amber-700',
    COMPRA_REPUESTO:         'bg-orange-100 text-orange-700',
    PLANIFICACION_REPARACION:'bg-amber-100 text-amber-700',
    INICIO_REPARACION:       'bg-orange-100 text-orange-700',
    EN_PROCESO_ISLAS:        'bg-blue-100 text-blue-700',
    CONTROL_CALIDAD:         'bg-cyan-100 text-cyan-700',
    LISTO_ENTREGA:           'bg-blue-100 text-blue-700',
    ENTREGADO:               'bg-teal-100 text-teal-700',
  };
  return classes[status] ?? 'bg-gray-100 text-gray-700';
}
