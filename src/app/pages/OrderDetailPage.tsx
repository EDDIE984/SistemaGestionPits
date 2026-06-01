import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarClock, Car, ClipboardCheck, ClipboardList, Factory, Printer, Trash2, UserRound } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { printOrderBarcode } from '@/app/components/OrderBarcodeLabel';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Progress } from '@/app/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { orderFlow } from '@/app/data/mockData';
import { formatDateTime, formatMoney, orderStatusLabel } from '@/app/lib/format';
import {
  deleteMockOrder,
  saveMockOrderProcess,
  updateMockOrderStatus,
  useMockOrderProcess,
  useMockOrders,
} from '@/app/store/mockOrders';
import type { OrderProcess, OrderStatus } from '@/app/types';

type MockOrderProcess = OrderProcess;

type StepForm = Record<string, string | boolean>;

const initialForms: Record<OrderStatus, StepForm> = {
  INGRESADA: { observacion: 'Ingreso revisado para iniciar proforma.' },
  LEVANTAMIENTO_PROFORMA: {
    tipo_cliente: 'PARTICULAR',
    pieza: '',
    categoria_dano: 'K3',
    observacion_pieza: '',
    requiere_reemplazo: false,
    costo_estimado: '',
    foto_url_pieza: '',
    estado_aprobacion: 'PENDIENTE_ENVIO',
    fecha_envio: '',
    fecha_aprobacion: '',
    observaciones_aprobacion: '',
    documento_url: '',
    descripcion_repuesto: '',
    cantidad_repuesto: '1',
    estado_repuesto: 'PENDIENTE',
    proveedor: '',
    fecha_estimada_llegada: '',
    fecha_real_llegada: '',
    costo_repuesto: '',
    observaciones_repuesto: '',
  },
  GESTION_ASEGURADORA: {
    aplica_aseguradora: true,
    estado: 'PENDIENTE_ENVIO',
    fecha_envio: '',
    fecha_aprobacion: '',
    observaciones: '',
    documento_url: '',
  },
  COMPRA_REPUESTO: {
    descripcion: '',
    cantidad: '1',
    estado: 'PENDIENTE',
    proveedor: '',
    fecha_estimada_llegada: '',
    fecha_real_llegada: '',
    costo: '',
    observaciones: '',
  },
  PLANIFICACION_REPARACION: {
    isla: 'Enderezada',
    operacion: '',
    tecnico: '',
    tiempo_estandar_horas: '1',
    tarifa_hora: '25',
    fecha_inicio_planificada: '',
    fecha_fin_planificada: '',
    observaciones: '',
  },
  INICIO_REPARACION: { observacion: 'Reparacion autorizada para iniciar en islas.' },
  EN_PROCESO_ISLAS: { observacion: 'Tareas de isla en ejecucion.' },
  CONTROL_CALIDAD: {
    resultado: 'APROBADO',
    punto_control: 'Revision visual final',
    punto_resultado: 'APROBADO',
    observaciones: '',
    foto_url: '',
  },
  LISTO_ENTREGA: {
    fecha_notificacion_cliente: '',
    observaciones: '',
    foto_url: '',
  },
  ENTREGADO: {
    fecha_entrega_real: '',
    observaciones: '',
    foto_url: '',
    confirmada: true,
  },
};

const damageCategoryOptions = [
  { value: 'K1', label: 'K1 - Se puede remover limpiando' },
  { value: 'K2', label: 'K2 - Se puede remover puliendo' },
  { value: 'K3', label: 'K3 - Dano pequeno que requiere un profesional' },
  { value: 'K4', label: 'K4 - Un profesional tiene que reparar' },
  { value: 'K5', label: 'K5 - Puede que la parte requiera reemplazo' },
];

const flowStepStyles = [
  { idle: 'border-sky-100 bg-sky-50/55', done: 'border-sky-200 bg-sky-50', current: 'border-sky-500 bg-sky-50 ring-1 ring-sky-200', accent: 'bg-sky-500' },
  { idle: 'border-violet-100 bg-violet-50/55', done: 'border-violet-200 bg-violet-50', current: 'border-violet-500 bg-violet-50 ring-1 ring-violet-200', accent: 'bg-violet-500' },
  { idle: 'border-amber-100 bg-amber-50/60', done: 'border-amber-200 bg-amber-50', current: 'border-amber-500 bg-amber-50 ring-1 ring-amber-200', accent: 'bg-amber-500' },
  { idle: 'border-orange-100 bg-orange-50/55', done: 'border-orange-200 bg-orange-50', current: 'border-orange-500 bg-orange-50 ring-1 ring-orange-200', accent: 'bg-orange-500' },
  { idle: 'border-cyan-100 bg-cyan-50/55', done: 'border-cyan-200 bg-cyan-50', current: 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200', accent: 'bg-cyan-500' },
  { idle: 'border-blue-100 bg-blue-50/55', done: 'border-blue-200 bg-blue-50', current: 'border-blue-500 bg-blue-50 ring-1 ring-blue-200', accent: 'bg-blue-500' },
  { idle: 'border-teal-100 bg-teal-50/55', done: 'border-teal-200 bg-teal-50', current: 'border-teal-500 bg-teal-50 ring-1 ring-teal-200', accent: 'bg-teal-500' },
  { idle: 'border-emerald-100 bg-emerald-50/55', done: 'border-emerald-200 bg-emerald-50', current: 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200', accent: 'bg-emerald-500' },
  { idle: 'border-lime-100 bg-lime-50/55', done: 'border-lime-200 bg-lime-50', current: 'border-lime-500 bg-lime-50 ring-1 ring-lime-200', accent: 'bg-lime-500' },
];

export function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const orders = useMockOrders();
  const order = orders.find((item) => item.id === id);
  const process = useMockOrderProcess(order?.id);
  const [form, setForm] = useState<StepForm>(initialForms.INGRESADA);
  const [saveNotice, setSaveNotice] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (order && process) {
      setForm(formFromProcess(order.estado, process, order.tipo_cliente));
    }
  }, [order?.id, order?.estado, process]);

  if (!order || !process) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Card>
          <CardContent className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
            <ClipboardList className="h-10 w-10 text-gray-400" />
            <div>
              <h1 className="text-2xl text-gray-900">Orden no encontrada</h1>
              <p className="mt-2 text-sm text-gray-600">La orden pudo haber sido eliminada del mock local.</p>
            </div>
            <Button asChild>
              <Link to="/ordenes">Volver a ordenes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentIndex = orderFlow.indexOf(order.estado);
  const previousStatus = currentIndex > 0 ? orderFlow[currentIndex - 1] : null;
  const nextStatus = getNextStatus(order.estado, form, process);

  const updateField = (field: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const showSavedNotice = (message: string) => {
    setSaveNotice(message);
    window.setTimeout(() => setSaveNotice(''), 2800);
  };

  const saveCurrentStep = async () => {
    const nextProcess = withHistoryEntry(
      applyStepData(process, order.estado, form),
      order.estado,
      form
    );
    await saveMockOrderProcess(order.id, nextProcess, order.estado);
    showSavedNotice('Datos guardados.');
    return nextProcess;
  };

  const handleSaveAndAdvance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await saveCurrentStep();

    if (nextStatus) {
      await updateMockOrderStatus(order.id, nextStatus, statusObservation(order.estado, form));
    }
  };

  const handleGoBack = async () => {
    if (previousStatus) {
      await updateMockOrderStatus(order.id, previousStatus, 'Retorno manual de estado desde detalle de orden.');
    }
  };

  const handleDeleteOrder = async () => {
    if (order.estado !== 'LEVANTAMIENTO_PROFORMA') return;

    const shouldDelete = window.confirm(
      `Se eliminara permanentemente la orden ${order.numero_orden}. Esta accion no se puede deshacer. Deseas continuar?`,
    );

    if (!shouldDelete) return;

    await deleteMockOrder(order.id);
    navigate('/ordenes');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={ClipboardCheck}
        title={order.numero_orden}
        description={`${order.placa} · ${order.marca} ${order.modelo}`}
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => printOrderBarcode(order.numero_orden)}>
              <Printer className="h-4 w-4" />
              Imprimir codigo
            </Button>
            {order.estado === 'LEVANTAMIENTO_PROFORMA' ? (
              <Button variant="destructive" onClick={handleDeleteOrder}>
                <Trash2 className="h-4 w-4" />
                Eliminar OT
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => navigate('/ordenes')}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_390px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <CardTitle>Resumen de la orden</CardTitle>
                  <p className="mt-1 text-sm text-gray-600">Informacion principal para seguimiento operativo.</p>
                </div>
                <StatusBadge status={order.estado} />
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Avance</span>
                  <span className="font-medium text-gray-900">{order.progreso}%</span>
                </div>
                <Progress value={order.progreso} className="h-2" />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <InfoTile icon={UserRound} label="Cliente" value={order.cliente} />
                <InfoTile icon={Car} label="Vehiculo" value={`${order.placa} · ${order.marca} ${order.modelo}`} />
                <InfoTile icon={Factory} label="Sucursal" value={order.sucursal} />
                <InfoTile icon={CalendarClock} label="Ingreso" value={formatDateTime(order.fecha_ingreso)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle>Gestion del estado actual</CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)}>
                  Ver historial
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleSaveAndAdvance}>
                {saveNotice ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                    {saveNotice}
                  </div>
                ) : null}

                <StepFields status={order.estado} form={form} onChange={updateField} />

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => { void saveCurrentStep(); }}>
                    Guardar datos
                  </Button>
                  <Button type="submit" disabled={!nextStatus}>
                    {nextStatus ? `Guardar y avanzar a ${orderStatusLabel(nextStatus)}` : nextBlockedLabel(order.estado, form, process)}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <SavedDataSummary process={process} />
        </div>

        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Flujo de trabajo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {orderFlow.map((status, index) => {
                const isDone = index < currentIndex;
                const isCurrent = status === order.estado;
                const style = flowStepStyles[index % flowStepStyles.length];
                return (
                  <div
                    key={status}
                    className={`relative overflow-hidden rounded-lg border p-3 transition-colors ${
                      isCurrent
                        ? style.current
                        : isDone
                          ? style.done
                          : style.idle
                    }`}
                  >
                    <span className={`absolute inset-y-0 left-0 w-1 ${style.accent}`} />
                    <div className="flex items-start justify-between gap-3">
                      <div className="pl-2">
                        <p className="text-sm font-medium text-gray-900">{orderStatusLabel(status)}</p>
                        <p className="mt-1 text-xs text-gray-500">Paso {index + 1} de {orderFlow.length}</p>
                      </div>
                      {isCurrent ? <StatusBadge status={status} /> : null}
                    </div>
                  </div>
                );
              })}

              <Button variant="outline" className="w-full" disabled={!previousStatus} onClick={handleGoBack}>
                Regresar estado
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {process.historial.length === 0 ? (
                <p className="text-sm text-gray-600">Aun no hay cambios registrados.</p>
              ) : (
                process.historial.slice().reverse().map((item, index) => (
                  <div key={`${item.fecha_hora}-${index}`} className="rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-sm font-medium text-gray-900">{historyTitle(item)}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDateTime(item.fecha_hora)}</p>
                    {item.observacion ? <p className="mt-2 text-sm text-gray-600">{item.observacion}</p> : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <HistoryDialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen} process={process} />
    </div>
  );
}

function getNextStatus(status: OrderStatus, form: StepForm, process: MockOrderProcess) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const aprobada = String(form.estado_aprobacion || '') === 'APROBADO';
    const repuestosListos = process.repuestos.length > 0
      && process.repuestos.every((r) => r.estado === 'RECIBIDO');
    if (!aprobada || !repuestosListos) return null;
    return 'PLANIFICACION_REPARACION' as OrderStatus;
  }

  if (status === 'GESTION_ASEGURADORA') {
    const insuranceStatus = String(form.estado || '');
    if (insuranceStatus !== 'APROBADO' && insuranceStatus !== 'NO_APLICA') {
      return null;
    }
  }

  if (status === 'COMPRA_REPUESTO' && String(form.estado || '') !== 'RECIBIDO') {
    return null;
  }

  if (status === 'ENTREGADO') return null;

  const currentIndex = orderFlow.indexOf(status);
  if (currentIndex === -1) return null;
  return currentIndex < orderFlow.length - 1 ? orderFlow[currentIndex + 1] : null;
}

function nextBlockedLabel(status: OrderStatus, form: StepForm, process: MockOrderProcess) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const aprobada = String(form.estado_aprobacion || '') === 'APROBADO';
    const repuestosListos = process.repuestos.length > 0
      && process.repuestos.every((r) => r.estado === 'RECIBIDO');
    if (!aprobada && !repuestosListos) return 'Requiere aprobación y repuestos';
    if (!aprobada) return 'Requiere aprobación';
    return 'Repuestos pendientes de recibir';
  }
  if (status === 'ENTREGADO') return 'Orden cerrada';
  return 'No puede avanzar';
}

function formFromProcess(status: OrderStatus, process: MockOrderProcess, tipo_cliente: 'PARTICULAR' | 'ASEGURADORA'): StepForm {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const lastPieza = process.proforma.at(-1);
    const lastRepuesto = process.repuestos.at(-1);
    return {
      ...initialForms.LEVANTAMIENTO_PROFORMA,
      tipo_cliente,
      pieza: lastPieza?.pieza ?? '',
      categoria_dano: lastPieza?.categoria_dano ?? 'K3',
      observacion_pieza: lastPieza?.observacion ?? '',
      requiere_reemplazo: lastPieza?.requiere_reemplazo ?? false,
      costo_estimado: String(lastPieza?.costo_estimado ?? ''),
      foto_url_pieza: lastPieza?.foto_url ?? '',
      estado_aprobacion: ['NO_APLICA', '', undefined].includes(process.aseguradora.estado)
        ? 'PENDIENTE_ENVIO'
        : process.aseguradora.estado,
      fecha_envio: process.aseguradora.fecha_envio ?? '',
      fecha_aprobacion: process.aseguradora.fecha_aprobacion ?? '',
      observaciones_aprobacion: process.aseguradora.observaciones ?? '',
      documento_url: process.aseguradora.documento_url ?? '',
      descripcion_repuesto: lastRepuesto?.descripcion ?? '',
      cantidad_repuesto: String(lastRepuesto?.cantidad ?? 1),
      estado_repuesto: lastRepuesto?.estado ?? 'PENDIENTE',
      proveedor: lastRepuesto?.proveedor ?? '',
      fecha_estimada_llegada: lastRepuesto?.fecha_estimada_llegada ?? '',
      fecha_real_llegada: lastRepuesto?.fecha_real_llegada ?? '',
      costo_repuesto: String(lastRepuesto?.costo ?? ''),
      observaciones_repuesto: lastRepuesto?.observaciones ?? '',
    };
  }

  if (status === 'PLANIFICACION_REPARACION') {
    const last = process.tareas.at(-1);
    return last
      ? {
        ...initialForms.PLANIFICACION_REPARACION,
        isla: last.isla,
        operacion: last.operacion,
        tecnico: last.tecnico,
        tiempo_estandar_horas: String(last.tiempo_estandar_horas || ''),
        tarifa_hora: String(last.tarifa_hora || ''),
        fecha_inicio_planificada: last.fecha_inicio_planificada,
        fecha_fin_planificada: last.fecha_fin_planificada,
        observaciones: last.observaciones,
      }
      : initialForms.PLANIFICACION_REPARACION;
  }

  if (status === 'CONTROL_CALIDAD') {
    return {
      ...initialForms.CONTROL_CALIDAD,
      ...process.calidad,
    };
  }

  if (status === 'LISTO_ENTREGA') {
    return {
      ...initialForms.LISTO_ENTREGA,
      fecha_notificacion_cliente: process.entrega.fecha_notificacion_cliente,
      observaciones: process.entrega.observaciones,
      foto_url: process.entrega.foto_url,
    };
  }

  if (status === 'ENTREGADO') {
    return {
      ...initialForms.ENTREGADO,
      fecha_entrega_real: process.entrega.fecha_entrega_real,
      observaciones: process.entrega.observaciones,
      foto_url: process.entrega.foto_url,
      confirmada: process.entrega.confirmada,
    };
  }

  return initialForms[status];
}

function applyStepData(process: MockOrderProcess, status: OrderStatus, form: StepForm): MockOrderProcess {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const pieza = String(form.pieza || '').trim();
    const updatedPieza = {
      pieza,
      categoria_dano: String(form.categoria_dano || 'K3'),
      observacion: String(form.observacion_pieza || ''),
      requiere_reemplazo: Boolean(form.requiere_reemplazo),
      costo_estimado: Number(form.costo_estimado || 0),
      foto_url: String(form.foto_url_pieza || ''),
    };

    const updatedAseguradora = {
      ...process.aseguradora,
      aplica_aseguradora: form.tipo_cliente === 'ASEGURADORA',
      estado: String(form.estado_aprobacion || 'PENDIENTE_ENVIO'),
      fecha_envio: String(form.fecha_envio || ''),
      fecha_aprobacion: String(form.fecha_aprobacion || ''),
      observaciones: String(form.observaciones_aprobacion || ''),
      documento_url: String(form.documento_url || ''),
    };

    const descripcion = String(form.descripcion_repuesto || '').trim();
    const hasRepuestoData = descripcion
      || String(form.proveedor || '').trim()
      || String(form.fecha_estimada_llegada || '').trim()
      || Number(form.costo_repuesto || 0) > 0;
    const updatedRepuesto = {
      descripcion: descripcion || 'Repuesto por definir',
      cantidad: Number(form.cantidad_repuesto || 1),
      estado: String(form.estado_repuesto || 'PENDIENTE'),
      proveedor: String(form.proveedor || ''),
      fecha_estimada_llegada: String(form.fecha_estimada_llegada || ''),
      fecha_real_llegada: String(form.fecha_real_llegada || ''),
      costo: Number(form.costo_repuesto || 0),
      observaciones: String(form.observaciones_repuesto || ''),
    };

    return {
      ...process,
      proforma: pieza ? upsertLast(process.proforma, updatedPieza) : process.proforma,
      aseguradora: updatedAseguradora,
      repuestos: hasRepuestoData ? upsertLast(process.repuestos, updatedRepuesto) : process.repuestos,
    };
  }

  if (status === 'PLANIFICACION_REPARACION') {
    const operacion = String(form.operacion || '').trim();
    const nextTask = {
      isla: String(form.isla || 'Enderezada'),
      operacion,
      tecnico: String(form.tecnico || ''),
      tiempo_estandar_horas: Number(form.tiempo_estandar_horas || 0),
      tarifa_hora: Number(form.tarifa_hora || 0),
      fecha_inicio_planificada: String(form.fecha_inicio_planificada || ''),
      fecha_fin_planificada: String(form.fecha_fin_planificada || ''),
      estado: 'PENDIENTE' as const,
      observaciones: String(form.observaciones || ''),
    };

    return operacion
      ? {
        ...process,
        tareas: appendItem(process.tareas, nextTask),
      }
      : process;
  }

  if (status === 'CONTROL_CALIDAD') {
    return {
      ...process,
      calidad: {
        resultado: String(form.resultado || 'APROBADO'),
        punto_control: String(form.punto_control || ''),
        punto_resultado: String(form.punto_resultado || 'APROBADO'),
        observaciones: String(form.observaciones || ''),
        foto_url: String(form.foto_url || ''),
      },
    };
  }

  if (status === 'LISTO_ENTREGA' || status === 'ENTREGADO') {
    return {
      ...process,
      entrega: {
        fecha_notificacion_cliente: String(form.fecha_notificacion_cliente || process.entrega.fecha_notificacion_cliente),
        fecha_entrega_real: String(form.fecha_entrega_real || process.entrega.fecha_entrega_real),
        observaciones: String(form.observaciones || process.entrega.observaciones),
        foto_url: String(form.foto_url || process.entrega.foto_url),
        confirmada: Boolean(form.confirmada || status === 'ENTREGADO'),
      },
    };
  }

  return process;
}

function upsertLast<T>(items: T[], nextItem: T) {
  return items.length > 0 ? [...items.slice(0, -1), nextItem] : [nextItem];
}

function appendItem<T>(items: T[], nextItem: T) {
  return [...items, nextItem];
}

function withHistoryEntry(process: MockOrderProcess, status: OrderStatus, form: StepForm): MockOrderProcess {
  return {
    ...process,
    historial: [
      ...process.historial,
      {
        tipo: 'DATOS_GUARDADOS',
        estado_actual: status,
        fecha_hora: new Date().toISOString(),
        titulo: `Datos guardados en ${orderStatusLabel(status)}`,
        detalle: statusObservation(status, form),
        observacion: statusObservation(status, form),
        datos: historyDataForStatus(status, form),
      },
    ],
  };
}

function historyDataForStatus(status: OrderStatus, form: StepForm) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    return {
      tipo_cliente: form.tipo_cliente,
      pieza: form.pieza,
      categoria_dano: form.categoria_dano,
      requiere_reemplazo: form.requiere_reemplazo,
      costo_estimado: form.costo_estimado,
      estado_aprobacion: form.estado_aprobacion,
      fecha_envio: form.fecha_envio,
      fecha_aprobacion: form.fecha_aprobacion,
      descripcion_repuesto: form.descripcion_repuesto,
      estado_repuesto: form.estado_repuesto,
    };
  }

  if (status === 'GESTION_ASEGURADORA') {
    return {
      aplica_aseguradora: form.aplica_aseguradora,
      estado: form.estado,
      fecha_envio: form.fecha_envio,
      fecha_aprobacion: form.fecha_aprobacion,
      observaciones: form.observaciones,
      documento_url: form.documento_url,
    };
  }

  if (status === 'COMPRA_REPUESTO') {
    return {
      descripcion: form.descripcion || 'Repuesto por definir',
      cantidad: form.cantidad,
      estado: form.estado,
      proveedor: form.proveedor,
      fecha_estimada_llegada: form.fecha_estimada_llegada,
      fecha_real_llegada: form.fecha_real_llegada,
      costo: form.costo,
      observaciones: form.observaciones,
    };
  }

  if (status === 'PLANIFICACION_REPARACION') {
    return {
      isla: form.isla,
      operacion: form.operacion,
      tecnico: form.tecnico,
      tiempo_estandar_horas: form.tiempo_estandar_horas,
      tarifa_hora: form.tarifa_hora,
      fecha_inicio_planificada: form.fecha_inicio_planificada,
      fecha_fin_planificada: form.fecha_fin_planificada,
      observaciones: form.observaciones,
    };
  }

  return form;
}

function statusObservation(status: OrderStatus, form: StepForm) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const tipo = String(form.tipo_cliente || 'PARTICULAR');
    return `Proforma registrada (${tipo}): ${String(form.pieza || 'sin pieza')}. Aprobación: ${String(form.estado_aprobacion || 'PENDIENTE_ENVIO')}.`;
  }
  if (status === 'GESTION_ASEGURADORA') return `Gestion aseguradora: ${String(form.estado || 'NO_APLICA')}.`;
  if (status === 'COMPRA_REPUESTO') return `Repuesto registrado: ${String(form.descripcion || 'sin repuesto especifico')}.`;
  if (status === 'PLANIFICACION_REPARACION') return `Tarea planificada: ${String(form.operacion || 'sin operacion especifica')}.`;
  if (status === 'CONTROL_CALIDAD') return `Control de calidad: ${String(form.resultado || 'APROBADO')}.`;
  if (status === 'LISTO_ENTREGA') return 'Cliente notificado para entrega.';
  if (status === 'ENTREGADO') return 'Orden entregada y cerrada.';
  return String(form.observacion || `Avance desde ${orderStatusLabel(status)}.`);
}

interface StepFieldsProps {
  status: OrderStatus;
  form: StepForm;
  onChange: (field: string, value: string | boolean) => void;
}

function StepFields({ status, form, onChange }: StepFieldsProps) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Pieza afectada" value={String(form.pieza)} onChange={(value) => onChange('pieza', value)} placeholder="Guardafango delantero" />
          <SelectField
            label="Categoria de dano"
            value={String(form.categoria_dano)}
            onChange={(value) => onChange('categoria_dano', value)}
            options={damageCategoryOptions}
          />
          <Field label="Costo estimado" type="number" value={String(form.costo_estimado)} onChange={(value) => onChange('costo_estimado', value)} placeholder="0.00" />
          <Field label="URL foto" value={String(form.foto_url)} onChange={(value) => onChange('foto_url', value)} placeholder="https://..." />
        </div>
        <CheckField label="Requiere reemplazo" checked={Boolean(form.requiere_reemplazo)} onChange={(value) => onChange('requiere_reemplazo', value)} />
        <CheckField label="Aplica gestion de aseguradora al avanzar" checked={Boolean(form.aplica_aseguradora)} onChange={(value) => onChange('aplica_aseguradora', value)} />
        <TextField label="Observacion" value={String(form.observacion)} onChange={(value) => onChange('observacion', value)} />
      </div>
    );
  }

  if (status === 'GESTION_ASEGURADORA') {
    return (
      <div className="space-y-4">
        <CheckField label="Aplica aseguradora" checked={Boolean(form.aplica_aseguradora)} onChange={(value) => onChange('aplica_aseguradora', value)} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField label="Estado aprobacion" value={String(form.estado)} onChange={(value) => onChange('estado', value)} options={['NO_APLICA', 'PENDIENTE_ENVIO', 'ENVIADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'OBSERVADO']} />
          <Field label="Fecha envio" type="date" value={String(form.fecha_envio)} onChange={(value) => onChange('fecha_envio', value)} />
          <Field label="Fecha aprobacion" type="date" value={String(form.fecha_aprobacion)} onChange={(value) => onChange('fecha_aprobacion', value)} />
          <Field label="Documento adjunto URL" value={String(form.documento_url)} onChange={(value) => onChange('documento_url', value)} placeholder="https://..." />
        </div>
        <TextField label="Observaciones" value={String(form.observaciones)} onChange={(value) => onChange('observaciones', value)} />
      </div>
    );
  }

  if (status === 'COMPRA_REPUESTO') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Repuesto requerido" value={String(form.descripcion)} onChange={(value) => onChange('descripcion', value)} placeholder="Parachoques delantero" />
          <Field label="Cantidad" type="number" value={String(form.cantidad)} onChange={(value) => onChange('cantidad', value)} />
          <SelectField label="Estado de compra" value={String(form.estado)} onChange={(value) => onChange('estado', value)} options={['PENDIENTE', 'SOLICITADO', 'COMPRADO', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO']} />
          <Field label="Proveedor" value={String(form.proveedor)} onChange={(value) => onChange('proveedor', value)} />
          <Field label="Fecha estimada llegada" type="date" value={String(form.fecha_estimada_llegada)} onChange={(value) => onChange('fecha_estimada_llegada', value)} />
          <Field label="Fecha real llegada" type="date" value={String(form.fecha_real_llegada)} onChange={(value) => onChange('fecha_real_llegada', value)} />
          <Field label="Costo" type="number" value={String(form.costo)} onChange={(value) => onChange('costo', value)} />
        </div>
        <TextField label="Observaciones" value={String(form.observaciones)} onChange={(value) => onChange('observaciones', value)} />
      </div>
    );
  }

  if (status === 'PLANIFICACION_REPARACION') {
    const costo = Number(form.tiempo_estandar_horas || 0) * Number(form.tarifa_hora || 0);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField label="Isla" value={String(form.isla)} onChange={(value) => onChange('isla', value)} options={['Enderezada', 'Pintura', 'Mecanica', 'Calidad']} />
          <Field label="Operacion" value={String(form.operacion)} onChange={(value) => onChange('operacion', value)} placeholder="Enderezada de panel lateral" />
          <Field label="Tecnico" value={String(form.tecnico)} onChange={(value) => onChange('tecnico', value)} placeholder="Carlos Enderezada" />
          <Field label="Tiempo estandar horas" type="number" value={String(form.tiempo_estandar_horas)} onChange={(value) => onChange('tiempo_estandar_horas', value)} />
          <Field label="Tarifa hora" type="number" value={String(form.tarifa_hora)} onChange={(value) => onChange('tarifa_hora', value)} />
          <Field label="Costo estimado" value={formatMoney(costo)} onChange={() => undefined} disabled />
          <Field label="Inicio planificado" type="datetime-local" value={String(form.fecha_inicio_planificada)} onChange={(value) => onChange('fecha_inicio_planificada', value)} />
          <Field label="Fin planificado" type="datetime-local" value={String(form.fecha_fin_planificada)} onChange={(value) => onChange('fecha_fin_planificada', value)} />
        </div>
        <TextField label="Observaciones" value={String(form.observaciones)} onChange={(value) => onChange('observaciones', value)} />
      </div>
    );
  }

  if (status === 'CONTROL_CALIDAD') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField label="Resultado general" value={String(form.resultado)} onChange={(value) => onChange('resultado', value)} options={['APROBADO', 'RECHAZADO']} />
          <Field label="Punto de control" value={String(form.punto_control)} onChange={(value) => onChange('punto_control', value)} />
          <SelectField label="Resultado del punto" value={String(form.punto_resultado)} onChange={(value) => onChange('punto_resultado', value)} options={['APROBADO', 'OBSERVADO']} />
          <Field label="URL foto revision" value={String(form.foto_url)} onChange={(value) => onChange('foto_url', value)} placeholder="https://..." />
        </div>
        <TextField label="Observaciones" value={String(form.observaciones)} onChange={(value) => onChange('observaciones', value)} />
      </div>
    );
  }

  if (status === 'LISTO_ENTREGA') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Fecha notificacion cliente" type="datetime-local" value={String(form.fecha_notificacion_cliente)} onChange={(value) => onChange('fecha_notificacion_cliente', value)} />
          <Field label="URL foto entrega" value={String(form.foto_url)} onChange={(value) => onChange('foto_url', value)} placeholder="https://..." />
        </div>
        <TextField label="Observaciones de entrega" value={String(form.observaciones)} onChange={(value) => onChange('observaciones', value)} />
      </div>
    );
  }

  if (status === 'ENTREGADO') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Fecha entrega real" type="datetime-local" value={String(form.fecha_entrega_real)} onChange={(value) => onChange('fecha_entrega_real', value)} />
          <Field label="URL foto final" value={String(form.foto_url)} onChange={(value) => onChange('foto_url', value)} placeholder="https://..." />
        </div>
        <CheckField label="Confirmacion de entrega" checked={Boolean(form.confirmada)} onChange={(value) => onChange('confirmada', value)} />
        <TextField label="Observaciones finales" value={String(form.observaciones)} onChange={(value) => onChange('observaciones', value)} />
      </div>
    );
  }

  return (
    <TextField
      label="Observacion del avance"
      value={String(form.observacion)}
      onChange={(value) => onChange('observacion', value)}
    />
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}

function Field({ label, value, onChange, type = 'text', placeholder, disabled }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => {
            const item = typeof option === 'string' ? { value: option, label: option } : option;
            return (
              <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

function SavedDataSummary({ process }: { process: MockOrderProcess }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos registrados</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryBox title="Proforma" value={`${process.proforma.length} pieza(s)`} detail={process.proforma.at(-1)?.pieza} />
        <SummaryBox
          title="Aseguradora"
          value={process.aseguradora.estado}
          detail={[
            process.aseguradora.fecha_envio ? `Envio: ${process.aseguradora.fecha_envio}` : '',
            process.aseguradora.fecha_aprobacion ? `Aprobacion: ${process.aseguradora.fecha_aprobacion}` : '',
            process.aseguradora.observaciones,
          ].filter(Boolean).join(' · ')}
        />
        <SummaryBox title="Repuestos" value={`${process.repuestos.length} repuesto(s)`} detail={process.repuestos.at(-1)?.descripcion} />
        <SummaryBox title="Planificacion" value={`${process.tareas.length} tarea(s)`} detail={process.tareas.at(-1)?.operacion} />
        <SummaryBox title="Calidad" value={process.calidad.resultado} detail={process.calidad.observaciones} />
        <SummaryBox title="Entrega" value={process.entrega.confirmada ? 'Confirmada' : 'Pendiente'} detail={process.entrega.fecha_entrega_real} />
      </CardContent>
    </Card>
  );
}

function SummaryBox({ title, value, detail }: { title: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{title}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
      {detail ? <p className="mt-2 truncate text-sm text-gray-600">{detail}</p> : null}
    </div>
  );
}

function HistoryDialog({
  open,
  onOpenChange,
  process,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  process: MockOrderProcess;
}) {
  const events = process.historial.slice().reverse();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historial de la orden</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {events.length === 0 ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Aun no hay cambios guardados.</p>
          ) : (
            events.map((event, index) => (
              <div key={`${event.fecha_hora}-${index}`} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{historyTitle(event)}</p>
                    <p className="mt-1 text-xs text-gray-500">{formatDateTime(event.fecha_hora)}</p>
                  </div>
                  <span className={`rounded-md px-2 py-1 text-xs ${
                    isStatusHistoryEvent(event)
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {isStatusHistoryEvent(event) ? 'Estado' : 'Datos'}
                  </span>
                </div>

                {event.detalle || event.observacion ? (
                  <p className="mt-3 text-sm text-gray-700">{event.detalle || event.observacion}</p>
                ) : null}

                <HistoryDataView data={event.datos} />
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function historyTitle(event: MockOrderProcess['historial'][number]) {
  if (event.titulo) return event.titulo;
  if (event.estado_anterior && event.estado_nuevo) {
    return `${orderStatusLabel(event.estado_anterior)} a ${orderStatusLabel(event.estado_nuevo)}`;
  }
  if (event.estado_actual) return `Datos guardados en ${orderStatusLabel(event.estado_actual)}`;
  return 'Evento registrado';
}

function isStatusHistoryEvent(event: MockOrderProcess['historial'][number]) {
  return event.tipo === 'CAMBIO_ESTADO' || Boolean(event.estado_anterior && event.estado_nuevo);
}

function HistoryDataView({ data }: { data: unknown }) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;

  const entries = Object.entries(data)
    .filter(([, value]) => value !== '' && value !== null && value !== undefined)
    .map(([key, value]) => [historyFieldLabel(key), historyFieldValue(value)] as const);

  if (entries.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg bg-gray-50 p-3 sm:grid-cols-2">
      {entries.map(([label, value]) => (
        <div key={label} className="rounded-md bg-white px-3 py-2">
          <p className="text-xs uppercase text-gray-500">{label}</p>
          <p className="mt-1 break-words text-sm text-gray-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

function historyFieldLabel(key: string) {
  const labels: Record<string, string> = {
    aplica_aseguradora: 'Aplica aseguradora',
    estado: 'Estado',
    fecha_envio: 'Fecha envio',
    fecha_aprobacion: 'Fecha aprobacion',
    observaciones: 'Observaciones',
    documento_url: 'Documento',
    pieza: 'Pieza',
    categoria_dano: 'Categoria de dano',
    requiere_reemplazo: 'Requiere reemplazo',
    costo_estimado: 'Costo estimado',
    observacion: 'Observacion',
    descripcion: 'Repuesto',
    cantidad: 'Cantidad',
    proveedor: 'Proveedor',
    fecha_estimada_llegada: 'Fecha estimada',
    fecha_real_llegada: 'Fecha real',
    costo: 'Costo',
    isla: 'Isla',
    operacion: 'Operacion',
    tecnico: 'Tecnico',
    tiempo_estandar_horas: 'Tiempo estandar',
    tarifa_hora: 'Tarifa hora',
    fecha_inicio_planificada: 'Inicio planificado',
    fecha_fin_planificada: 'Fin planificado',
  };

  return labels[key] ?? key.replaceAll('_', ' ');
}

function historyFieldValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Si' : 'No';
  if (typeof value === 'number') return String(value);
  return String(value);
}

interface InfoTileProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoTile({ icon: Icon, label, value }: InfoTileProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 text-blue-600" />
        <div>
          <p className="text-xs uppercase text-gray-500">{label}</p>
          <p className="mt-1 text-sm font-medium text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
