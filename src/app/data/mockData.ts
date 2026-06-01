import type { OrderStatus } from '@/app/types';

export const orderFlow: OrderStatus[] = [
  'INGRESADA',
  'LEVANTAMIENTO_PROFORMA',
  'PLANIFICACION_REPARACION',
  'INICIO_REPARACION',
  'CONTROL_CALIDAD',
  'LISTO_ENTREGA',
  'ENTREGADO',
];

export const damageLevels = [
  { value: 'K1', label: 'K1', description: 'Se puede remover limpiando' },
  { value: 'K2', label: 'K2', description: 'Se puede remover puliendo' },
  { value: 'K3', label: 'K3', description: 'Dano pequeno que requiere profesional' },
  { value: 'K4', label: 'K4', description: 'Un profesional tiene que reparar' },
  { value: 'K5', label: 'K5', description: 'Puede requerir reemplazo' },
];
