export type RoleName =
  | 'ADMINISTRADOR'
  | 'JEFE_TALLER'
  | 'OPERARIO';

export type OrderStatus =
  | 'INGRESADA'
  | 'LEVANTAMIENTO_PROFORMA'
  | 'GESTION_ASEGURADORA'
  | 'COMPRA_REPUESTO'
  | 'PLANIFICACION_REPARACION'
  | 'INICIO_REPARACION'
  | 'EN_PROCESO_ISLAS'
  | 'CONTROL_CALIDAD'
  | 'LISTO_ENTREGA'
  | 'ENTREGADO';

export type TaskStatus = 'PENDIENTE' | 'EN_PROCESO' | 'PAUSADA' | 'COMPLETADA';

export type IslandSignal = 'a-tiempo' | 'por-vencer' | 'atrasado' | 'proximo';

export interface SessionUser {
  id: string;
  nombre: string;
  username: string;
  rol: RoleName;
  sucursal_id: string;
  sucursal_nombre: string;
  isla_id?: string;
  isla_nombre?: string;
}

export interface AssignedWorkshop {
  id: string;
  nombre: string;
  ciudad: string;
}

export interface DemoUser extends Omit<SessionUser, 'sucursal_id' | 'sucursal_nombre'> {
  password: string;
  talleres_asignados: AssignedWorkshop[];
  sucursal_id?: string;
  sucursal_nombre?: string;
}

export interface WorkshopOrder {
  id: string;
  numero_orden: string;
  estado: OrderStatus;
  tipo_cliente: 'PARTICULAR' | 'ASEGURADORA';
  sucursal_id: string;
  sucursal: string;
  placa: string;
  marca: string;
  modelo: string;
  cliente: string;
  asesor: string;
  aseguradora?: string;
  fecha_ingreso: string;
  fecha_entrega_estimada?: string;
  progreso: number;
}

export interface IslandTask {
  id: string;
  orden_id: string;
  numero_orden: string;
  isla: string;
  isla_id: string;
  tecnico: string;
  placa: string;
  vehiculo: string;
  operacion: string;
  estado: TaskStatus;
  signal: IslandSignal;
  inicio_planificado: string;
  fin_planificado: string;
  inicio_real?: string;
  tiempo_estandar_horas: number;
  tiempo_real_horas?: number;
  tarifa_hora: number;
  costo_estimado: number;
  eficiencia?: number;
}

export interface CatalogItem {
  id: string;
  nombre: string;
  isla: string;
  tiempo_estandar_horas: number;
  codigo_audatex?: string;
  activo: boolean;
}

export interface OrderProcess {
  proforma: Array<{
    id?: string;
    pieza: string;
    categoria_dano: string;
    observacion: string;
    requiere_reemplazo: boolean;
    costo_estimado: number;
    foto_url: string;
  }>;
  aseguradora: {
    id?: string;
    aplica_aseguradora: boolean;
    estado: string;
    fecha_envio: string;
    fecha_aprobacion: string;
    observaciones: string;
    documento_url: string;
  };
  repuestos: Array<{
    id?: string;
    descripcion: string;
    cantidad: number;
    estado: string;
    proveedor: string;
    fecha_estimada_llegada: string;
    fecha_real_llegada: string;
    costo: number;
    observaciones: string;
  }>;
  tareas: Array<{
    id?: string;
    isla: string;
    operacion: string;
    tecnico: string;
    tiempo_estandar_horas: number;
    tarifa_hora: number;
    fecha_inicio_planificada: string;
    fecha_fin_planificada: string;
    estado?: TaskStatus;
    fecha_inicio_real?: string;
    fecha_fin_real?: string;
    motivo_ajuste?: string;
    eventos?: Array<{
      accion: 'INICIAR' | 'PAUSAR' | 'REANUDAR' | 'FINALIZAR';
      fecha_hora: string;
      estado_resultante: TaskStatus;
      observacion: string;
    }>;
    observaciones: string;
  }>;
  calidad: {
    id?: string;
    resultado: string;
    punto_control: string;
    punto_resultado: string;
    observaciones: string;
    foto_url: string;
  };
  entrega: {
    id?: string;
    fecha_notificacion_cliente: string;
    fecha_entrega_real: string;
    observaciones: string;
    foto_url: string;
    confirmada: boolean;
  };
  historial: Array<{
    id?: string;
    tipo?: 'DATOS_GUARDADOS' | 'CAMBIO_ESTADO';
    estado_actual?: OrderStatus;
    estado_anterior?: OrderStatus;
    estado_nuevo?: OrderStatus;
    fecha_hora: string;
    titulo?: string;
    detalle?: string;
    observacion: string;
    datos?: unknown;
  }>;
}

export interface OrderPhotoAttachment {
  id: string;
  url: string;
  storage_path: string;
  etapa: 'PROFORMA' | 'CALIDAD' | 'ENTREGA' | 'GENERAL';
  nombre: string;
  pieza?: string;
  created_at: string;
}
