import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarClock, Car, ClipboardCheck, ClipboardList, Eye, Factory, ImagePlus, Loader2, Printer, Trash2, UploadCloud, UserRound, X } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Textarea } from '@/app/components/ui/textarea';
import { orderFlow } from '@/app/data/mockData';
import { formatDateTime, formatMoney, orderStatusLabel } from '@/app/lib/format';
import { deleteOrderPhoto, fetchOrderPhotos, uploadOrderPhotos } from '@/app/services/orderPhotosService';
import {
  deleteMockOrder,
  saveMockOrderProcess,
  updateMockOrderStatus,
  useMockOrderProcess,
  useMockOrders,
} from '@/app/store/mockOrders';
import type { OrderPhotoAttachment, OrderProcess, OrderStatus } from '@/app/types';

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
  const location = useLocation();
  const navigate = useNavigate();
  const orders = useMockOrders();
  const order = orders.find((item) => item.id === id);
  const process = useMockOrderProcess(order?.id);
  const [form, setForm] = useState<StepForm>(initialForms.INGRESADA);
  const [saveNotice, setSaveNotice] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeProformaTab, setActiveProformaTab] = useState<'piezas' | 'aprobacion' | 'repuestos'>('piezas');
  const [photos, setPhotos] = useState<OrderPhotoAttachment[]>([]);
  const [isPhotosLoading, setIsPhotosLoading] = useState(false);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<OrderPhotoAttachment | null>(null);

  useEffect(() => {
    if (order && process) {
      setForm(formFromProcess(order.estado, process, order.tipo_cliente));
    }
  }, [order?.id, order?.estado, process]);

  useEffect(() => {
    if (location.hash !== '#flujograma') return;

    window.requestAnimationFrame(() => {
      document.getElementById('flujograma')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [location.hash, order?.id]);

  useEffect(() => {
    if (!order?.id) return;

    setIsPhotosLoading(true);
    setPhotoError('');
    fetchOrderPhotos(order.id)
      .then(setPhotos)
      .catch((error) => setPhotoError(error instanceof Error ? error.message : 'No se pudieron cargar las fotos.'))
      .finally(() => setIsPhotosLoading(false));
  }, [order?.id]);

  useEffect(() => {
    if (order?.estado !== 'LEVANTAMIENTO_PROFORMA' || !process) return;

    const nextTab = nextAvailableProformaTab(process, activeProformaTab);
    if (nextTab !== activeProformaTab) {
      setActiveProformaTab(nextTab);
    }
  }, [activeProformaTab, order?.estado, process]);

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
  const projectedProcess = applyStepData(process, order.estado, form);
  const nextStatus = getNextStatus(order.estado, form, projectedProcess);
  const projectedProformaProgress = proformaProgress(projectedProcess);
  const isCurrentProformaSectionSavable = order.estado !== 'LEVANTAMIENTO_PROFORMA'
    || canSaveProformaSection(process, form, activeProformaTab);

  const updateField = (field: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const showSavedNotice = (message: string) => {
    setSaveNotice(message);
    window.setTimeout(() => setSaveNotice(''), 2800);
  };

  const saveCurrentStep = async () => {
    if (order.estado === 'LEVANTAMIENTO_PROFORMA' && !canSaveProformaSection(process, form, activeProformaTab)) {
      showSavedNotice(proformaSaveBlockedMessage(process, activeProformaTab));
      return process;
    }

    try {
      const nextProcess = withHistoryEntry(
        applyStepData(process, order.estado, form),
        order.estado,
        form,
        activeProformaTab
      );
      await saveMockOrderProcess(order.id, nextProcess, order.estado, order.estado === 'LEVANTAMIENTO_PROFORMA' ? activeProformaTab : undefined);
      showSavedNotice('Datos guardados.');
      return nextProcess;
    } catch (error) {
      showSavedNotice(error instanceof Error ? error.message : 'No se pudo guardar el registro.');
      return process;
    }
  };

  const handleSaveAndAdvance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (order.estado === 'LEVANTAMIENTO_PROFORMA' && nextStatus && proformaProgress(process).partsReceived) {
      await updateMockOrderStatus(order.id, nextStatus, statusObservation(order.estado, form));
      return;
    }

    const nextProcess = await saveCurrentStep();
    if (nextProcess === process) return;

    const nextAfterSave = getNextStatus(order.estado, form, nextProcess);
    if (nextAfterSave) {
      await updateMockOrderStatus(order.id, nextAfterSave, statusObservation(order.estado, form));
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

  const handlePhotosUpload = async (files: File[], etapa: OrderPhotoAttachment['etapa'], context?: { pieza?: string }) => {
    if (!order || files.length === 0) return;

    setIsUploadingPhotos(true);
    setPhotoError('');
    try {
      const uploaded = await uploadOrderPhotos(order.id, files, etapa, context);
      setPhotos((current) => [...uploaded, ...current]);
      showSavedNotice(`${uploaded.length} foto(s) cargada(s).`);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'No se pudieron cargar las fotos.');
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const handlePhotoDelete = async (photo: OrderPhotoAttachment) => {
    setPhotoError('');
    try {
      await deleteOrderPhoto(photo);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setSelectedPhoto((current) => current?.id === photo.id ? null : current);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'No se pudo eliminar la foto.');
    }
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
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>Gestión del estado actual</CardTitle>
                  <StatusBadge status={order.estado} />
                </div>
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

                <StepFields
                  status={order.estado}
                  form={form}
                  onChange={updateField}
                  process={process}
                  photos={photos}
                  isUploadingPhotos={isUploadingPhotos}
                  onPhotosUpload={handlePhotosUpload}
                  onPhotoSelect={setSelectedPhoto}
                  onPhotoDelete={handlePhotoDelete}
                  activeProformaTab={activeProformaTab}
                  onProformaTabChange={setActiveProformaTab}
                />

                {isIslandControlledStatus(order.estado) ? null : (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" disabled={!isCurrentProformaSectionSavable} onClick={() => { void saveCurrentStep(); }}>
                      Guardar datos
                    </Button>
                    <Button type="submit" disabled={!nextStatus || (order.estado === 'LEVANTAMIENTO_PROFORMA' && !projectedProformaProgress.partsReceived && !isCurrentProformaSectionSavable)}>
                      {nextStatus ? `Guardar y avanzar a ${orderStatusLabel(nextStatus)}` : nextBlockedLabel(order.estado, form, process)}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          <SavedDataSummary process={process} />
        </div>

        <div className="space-y-6">
          <Card id="flujograma" className="h-fit scroll-mt-8">
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

          <PhotoGalleryCard
            photos={photos}
            isLoading={isPhotosLoading}
            error={photoError}
            pieces={[...process.proforma.map((piece) => piece.pieza), String(form.pieza || '')]}
            onSelect={setSelectedPhoto}
            onDelete={handlePhotoDelete}
          />

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
      <PhotoPreviewDialog photo={selectedPhoto} onOpenChange={(open) => { if (!open) setSelectedPhoto(null); }} onDelete={handlePhotoDelete} />
    </div>
  );
}

function getNextStatus(status: OrderStatus, form: StepForm, process: MockOrderProcess) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const progress = proformaProgress(process);
    if (!progress.approvalApproved || !progress.partsReceived) return null;
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

function isIslandControlledStatus(status: OrderStatus) {
  return status === 'INICIO_REPARACION' || status === 'EN_PROCESO_ISLAS';
}

function proformaProgress(process: MockOrderProcess) {
  const hasPieces = process.proforma.length > 0;
  const approvalApproved = process.aseguradora.estado === 'APROBADO';
  const approvalRejected = process.aseguradora.estado === 'RECHAZADO';
  const approvalClosed = approvalApproved || approvalRejected;
  const hasApproval = Boolean(process.aseguradora.id);
  const partsReceived = process.repuestos.length > 0 && process.repuestos.some((part) => part.estado === 'RECIBIDO');
  const hasParts = process.repuestos.length > 0;

  return { hasPieces, hasApproval, approvalApproved, approvalRejected, approvalClosed, hasParts, partsReceived };
}

function proformaFlowMessage(progress: ReturnType<typeof proformaProgress>) {
  if (!progress.hasPieces) {
    return 'Registra primero Piezas y Daños. Aprobación y Repuestos se habilitarán después.';
  }

  if (!progress.approvalClosed) {
    return 'Piezas y Daños ya está cerrado. Completa la aprobación para habilitar Repuestos.';
  }

  if (progress.approvalRejected) {
    return 'La aprobación fue rechazada. La pestaña queda cerrada y la OT no puede avanzar a Repuestos hasta registrar una aprobación válida.';
  }

  if (!progress.partsReceived) {
    return 'Piezas y Aprobación ya están cerradas. Completa Repuestos para avanzar en la OT.';
  }

  return 'Proforma completa. Las pestañas de este flujo quedan cerradas para evitar registros incompletos o duplicados.';
}

function isProformaTabEnabled(process: MockOrderProcess, tab: 'piezas' | 'aprobacion' | 'repuestos') {
  const progress = proformaProgress(process);

  if (tab === 'piezas') return !progress.hasPieces && !progress.hasApproval && !progress.hasParts;
  if (tab === 'aprobacion') return progress.hasPieces && !progress.approvalClosed && !progress.hasParts;
  return progress.approvalApproved && !progress.partsReceived;
}

function nextAvailableProformaTab(process: MockOrderProcess, currentTab: 'piezas' | 'aprobacion' | 'repuestos') {
  if (isProformaTabEnabled(process, currentTab)) return currentTab;
  if (isProformaTabEnabled(process, 'piezas')) return 'piezas';
  if (isProformaTabEnabled(process, 'aprobacion')) return 'aprobacion';
  return 'repuestos';
}

function canSaveProformaSection(
  process: MockOrderProcess,
  form: StepForm,
  tab: 'piezas' | 'aprobacion' | 'repuestos'
) {
  if (!isProformaTabEnabled(process, tab)) return false;

  if (tab === 'piezas') {
    return String(form.pieza || '').trim().length > 0;
  }

  if (tab === 'aprobacion') {
    return String(form.estado_aprobacion || '').trim().length > 0;
  }

  return String(form.estado_repuesto || '').trim().length > 0;
}

function proformaSaveBlockedMessage(process: MockOrderProcess, tab: 'piezas' | 'aprobacion' | 'repuestos') {
  if (!isProformaTabEnabled(process, tab)) {
    if (tab === 'piezas') return 'Piezas y Daños ya fue registrado. Continúa con Aprobación.';
    if (tab === 'aprobacion') return 'Aprobación no está habilitada o ya fue completada. Continúa con Repuestos.';
    return 'Repuestos no está habilitado o ya fue completado.';
  }

  if (tab === 'piezas') return 'Ingresa una pieza afectada antes de guardar.';
  if (tab === 'aprobacion') return 'Selecciona un estado de aprobación antes de guardar.';
  return 'Selecciona un estado de repuesto antes de guardar.';
}

function nextBlockedLabel(status: OrderStatus, form: StepForm, process: MockOrderProcess) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const progress = proformaProgress(process);
    if (!progress.approvalApproved && !progress.partsReceived) return 'Requiere aprobación y repuestos';
    if (!progress.approvalApproved) return 'Requiere aprobación';
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
    const hasProformaRecords = process.proforma.length > 0 || process.aseguradora.id || process.repuestos.length > 0;
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
      aplica_aseguradora: hasProformaRecords ? process.aseguradora.aplica_aseguradora : form.tipo_cliente === 'ASEGURADORA',
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

function withHistoryEntry(
  process: MockOrderProcess,
  status: OrderStatus,
  form: StepForm,
  activeProformaTab?: 'piezas' | 'aprobacion' | 'repuestos'
): MockOrderProcess {
  if (hasDuplicateSectionHistory(process, status, form, activeProformaTab)) {
    return process;
  }

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

function hasDuplicateSectionHistory(
  process: MockOrderProcess,
  status: OrderStatus,
  form: StepForm,
  activeProformaTab?: 'piezas' | 'aprobacion' | 'repuestos'
) {
  if (status !== 'LEVANTAMIENTO_PROFORMA') return false;

  if (activeProformaTab === 'aprobacion') {
    const estadoAprobacion = String(form.estado_aprobacion || 'PENDIENTE_ENVIO');
    return process.historial.some((event) => {
      const data = event.datos;
      return event.estado_actual === status
        && isHistoryObject(data)
        && String(data.estado_aprobacion || '') === estadoAprobacion;
    });
  }

  if (activeProformaTab === 'repuestos') {
    const estadoRepuesto = String(form.estado_repuesto || 'PENDIENTE');
    return process.historial.some((event) => {
      const data = event.datos;
      return event.estado_actual === status
        && isHistoryObject(data)
        && String(data.estado_repuesto || '') === estadoRepuesto;
    });
  }

  return false;
}

function isHistoryObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
  process: MockOrderProcess;
  photos: OrderPhotoAttachment[];
  isUploadingPhotos: boolean;
  onPhotosUpload: (files: File[], etapa: OrderPhotoAttachment['etapa'], context?: { pieza?: string }) => void;
  onPhotoSelect: (photo: OrderPhotoAttachment) => void;
  onPhotoDelete: (photo: OrderPhotoAttachment) => void;
  activeProformaTab: 'piezas' | 'aprobacion' | 'repuestos';
  onProformaTabChange: (tab: 'piezas' | 'aprobacion' | 'repuestos') => void;
}

function StepFields({
  status,
  form,
  onChange,
  process,
  photos,
  isUploadingPhotos,
  onPhotosUpload,
  onPhotoSelect,
  onPhotoDelete,
  activeProformaTab,
  onProformaTabChange,
}: StepFieldsProps) {
  if (status === 'LEVANTAMIENTO_PROFORMA') {
    const hasProformaRecords = process.proforma.length > 0 || process.aseguradora.id || process.repuestos.length > 0;
    const tipoCliente = (
      hasProformaRecords
        ? process.aseguradora.aplica_aseguradora ? 'ASEGURADORA' : 'PARTICULAR'
        : String(form.tipo_cliente || 'PARTICULAR')
    ) as 'PARTICULAR' | 'ASEGURADORA';
    const approvalClosed = ['APROBADO', 'RECHAZADO'].includes(process.aseguradora.estado);
    const repuestosListos = process.repuestos.length > 0
      && process.repuestos.some((r) => r.estado === 'RECIBIDO');
    const progress = proformaProgress(process);
    const piecesEnabled = isProformaTabEnabled(process, 'piezas');
    const approvalEnabled = isProformaTabEnabled(process, 'aprobacion');
    const partsEnabled = isProformaTabEnabled(process, 'repuestos');

    return (
      <div className="space-y-4">
        {/* Selector tipo de cliente */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-6">
            <span className="text-sm font-medium text-gray-700">Tipo de cliente:</span>
            <label className={`flex items-center gap-2 text-sm ${hasProformaRecords ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="tipo_cliente"
                value="PARTICULAR"
                checked={tipoCliente === 'PARTICULAR'}
                disabled={hasProformaRecords}
                onChange={() => onChange('tipo_cliente', 'PARTICULAR')}
              />
              Particular
            </label>
            <label className={`flex items-center gap-2 text-sm ${hasProformaRecords ? 'cursor-not-allowed text-gray-400' : 'cursor-pointer'}`}>
              <input
                type="radio"
                name="tipo_cliente"
                value="ASEGURADORA"
                checked={tipoCliente === 'ASEGURADORA'}
                disabled={hasProformaRecords}
                onChange={() => onChange('tipo_cliente', 'ASEGURADORA')}
              />
              Aseguradora
            </label>
          </div>
          {hasProformaRecords ? (
            <p className="mt-2 text-xs text-gray-500">
              El tipo de cliente no se puede modificar porque esta OT ya tiene piezas, aprobaciones o repuestos registrados.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {proformaFlowMessage(progress)}
        </div>

        {/* Pestañas */}
        <Tabs value={activeProformaTab} onValueChange={(v) => onProformaTabChange(v as 'piezas' | 'aprobacion' | 'repuestos')}>
          <TabsList className="w-full">
            <TabsTrigger value="piezas" className="flex-1" disabled={!piecesEnabled}>
              Piezas & Daños
              {process.proforma.length > 0 ? <span className="ml-1 text-green-600">✓</span> : null}
            </TabsTrigger>
            <TabsTrigger value="aprobacion" className="flex-1" disabled={!approvalEnabled}>
              Aprobación
              {approvalClosed ? <span className="ml-1 text-green-600">✓</span> : <span className="ml-1 text-amber-500">⚠</span>}
            </TabsTrigger>
            <TabsTrigger value="repuestos" className="flex-1" disabled={!partsEnabled}>
              Repuestos
              {repuestosListos ? <span className="ml-1 text-green-600">✓</span> : <span className="ml-1 text-amber-500">⚠</span>}
            </TabsTrigger>
          </TabsList>

          {/* Pestaña 1: Piezas & Daños */}
          <TabsContent value="piezas" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Pieza afectada" value={String(form.pieza)} onChange={(v) => onChange('pieza', v)} placeholder="Guardafango delantero" />
              <SelectField
                label="Categoría de daño"
                value={String(form.categoria_dano)}
                onChange={(v) => onChange('categoria_dano', v)}
                options={damageCategoryOptions}
              />
              <Field label="Costo estimado" type="number" value={String(form.costo_estimado)} onChange={(v) => onChange('costo_estimado', v)} placeholder="0.00" />
            </div>
            <PhotoUploadPanel
              etapa="PROFORMA"
              title="Fotos de proforma"
              photos={photos.filter((photo) => photo.etapa === 'PROFORMA')}
              isUploading={isUploadingPhotos}
              onUpload={(files) => onPhotosUpload(files, 'PROFORMA', { pieza: String(form.pieza || '').trim() })}
              onSelect={onPhotoSelect}
              onDelete={onPhotoDelete}
            />
            <CheckField label="Requiere reemplazo" checked={Boolean(form.requiere_reemplazo)} onChange={(v) => onChange('requiere_reemplazo', v)} />
            <TextField label="Observación" value={String(form.observacion_pieza)} onChange={(v) => onChange('observacion_pieza', v)} />

            {process.proforma.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase text-gray-500">Piezas registradas ({process.proforma.length})</p>
                <div className="space-y-1">
                  {process.proforma.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                      <span className="font-medium text-gray-900">{p.pieza}</span>
                      <span className="text-gray-500">{p.categoria_dano} · ${p.costo_estimado}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Pestaña 2: Aprobación */}
          <TabsContent value="aprobacion" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Estado de aprobación"
                value={String(form.estado_aprobacion)}
                onChange={(v) => onChange('estado_aprobacion', v)}
                options={
                  tipoCliente === 'PARTICULAR'
                    ? ['PENDIENTE_ENVIO', 'ENVIADO', 'APROBADO', 'RECHAZADO']
                    : ['PENDIENTE_ENVIO', 'ENVIADO', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'OBSERVADO']
                }
              />
              <Field
                label={tipoCliente === 'PARTICULAR' ? 'Fecha envío proforma al cliente' : 'Fecha envío a aseguradora'}
                type="date"
                value={String(form.fecha_envio)}
                onChange={(v) => onChange('fecha_envio', v)}
              />
              <Field
                label={tipoCliente === 'PARTICULAR' ? 'Fecha aprobación del cliente' : 'Fecha aprobación aseguradora'}
                type="date"
                value={String(form.fecha_aprobacion)}
                onChange={(v) => onChange('fecha_aprobacion', v)}
              />
              {tipoCliente === 'ASEGURADORA' && (
                <Field label="URL documento adjunto" value={String(form.documento_url)} onChange={(v) => onChange('documento_url', v)} placeholder="https://..." />
              )}
            </div>
            <TextField label="Observaciones" value={String(form.observaciones_aprobacion)} onChange={(v) => onChange('observaciones_aprobacion', v)} />
          </TabsContent>

          {/* Pestaña 3: Repuestos */}
          <TabsContent value="repuestos" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Repuesto requerido" value={String(form.descripcion_repuesto)} onChange={(v) => onChange('descripcion_repuesto', v)} placeholder="Parachoques delantero" />
              <Field label="Cantidad" type="number" value={String(form.cantidad_repuesto)} onChange={(v) => onChange('cantidad_repuesto', v)} />
              <SelectField
                label="Estado de compra"
                value={String(form.estado_repuesto)}
                onChange={(v) => onChange('estado_repuesto', v)}
                options={['PENDIENTE', 'SOLICITADO', 'COMPRADO', 'EN_TRANSITO', 'RECIBIDO', 'CANCELADO']}
              />
              <Field label="Proveedor" value={String(form.proveedor)} onChange={(v) => onChange('proveedor', v)} />
              <Field label="Fecha estimada llegada" type="date" value={String(form.fecha_estimada_llegada)} onChange={(v) => onChange('fecha_estimada_llegada', v)} />
              <Field label="Fecha real llegada" type="date" value={String(form.fecha_real_llegada)} onChange={(v) => onChange('fecha_real_llegada', v)} />
              <Field label="Costo" type="number" value={String(form.costo_repuesto)} onChange={(v) => onChange('costo_repuesto', v)} />
            </div>
            <TextField label="Observaciones" value={String(form.observaciones_repuesto)} onChange={(v) => onChange('observaciones_repuesto', v)} />

            {process.repuestos.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase text-gray-500">Repuestos registrados ({process.repuestos.length})</p>
                <div className="space-y-1">
                  {process.repuestos.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                      <span className="font-medium text-gray-900">{r.descripcion}</span>
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${r.estado === 'RECIBIDO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {r.estado}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
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

  if (status === 'INICIO_REPARACION' || status === 'EN_PROCESO_ISLAS') {
    return (
      <div className="space-y-4">
        <RepairProgressPanel tasks={process.tareas} />
        <TextField label="Observación del avance" value={String(form.observacion)} onChange={(value) => onChange('observacion', value)} />
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
        </div>
        <PhotoUploadPanel
          etapa="CALIDAD"
          title="Fotos de revisión"
          photos={photos.filter((photo) => photo.etapa === 'CALIDAD')}
          isUploading={isUploadingPhotos}
          onUpload={(files) => onPhotosUpload(files, 'CALIDAD')}
          onSelect={onPhotoSelect}
          onDelete={onPhotoDelete}
        />
        <TextField label="Observaciones" value={String(form.observaciones)} onChange={(value) => onChange('observaciones', value)} />
      </div>
    );
  }

  if (status === 'LISTO_ENTREGA') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Fecha notificacion cliente" type="datetime-local" value={String(form.fecha_notificacion_cliente)} onChange={(value) => onChange('fecha_notificacion_cliente', value)} />
        </div>
        <PhotoUploadPanel
          etapa="ENTREGA"
          title="Fotos para entrega"
          photos={photos.filter((photo) => photo.etapa === 'ENTREGA')}
          isUploading={isUploadingPhotos}
          onUpload={(files) => onPhotosUpload(files, 'ENTREGA')}
          onSelect={onPhotoSelect}
          onDelete={onPhotoDelete}
        />
        <TextField label="Observaciones de entrega" value={String(form.observaciones)} onChange={(value) => onChange('observaciones', value)} />
      </div>
    );
  }

  if (status === 'ENTREGADO') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Fecha entrega real" type="datetime-local" value={String(form.fecha_entrega_real)} onChange={(value) => onChange('fecha_entrega_real', value)} />
        </div>
        <PhotoUploadPanel
          etapa="ENTREGA"
          title="Fotos finales"
          photos={photos.filter((photo) => photo.etapa === 'ENTREGA')}
          isUploading={isUploadingPhotos}
          onUpload={(files) => onPhotosUpload(files, 'ENTREGA')}
          onSelect={onPhotoSelect}
          onDelete={onPhotoDelete}
        />
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

function RepairProgressPanel({ tasks }: { tasks: MockOrderProcess['tareas'] }) {
  const orderedTasks = tasks.slice().sort((a, b) => new Date(a.fecha_inicio_planificada).getTime() - new Date(b.fecha_inicio_planificada).getTime());
  const summary = repairProgressSummary(orderedTasks);

  if (orderedTasks.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No hay islas planificadas para esta OT. Regresa a planificación y asigna las tareas antes de iniciar reparación.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <RepairMetric title="Islas asignadas" value={String(summary.total)} detail={`${summary.completed} completada(s)`} />
        <RepairMetric title="Avance temporal" value={`${summary.averageProgress}%`} detail={`${summary.inProgress} en proceso`} />
        <RepairMetric title="Ventana planificada" value={summary.windowLabel} detail={summary.overdueCount > 0 ? `${summary.overdueCount} atrasada(s)` : 'Sin atrasos críticos'} />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-medium text-gray-900">Islas y fechas planificadas</p>
          <p className="mt-1 text-xs text-gray-500">El avance se calcula contra la duración planificada de cada tarea.</p>
        </div>
        <div className="divide-y divide-gray-100">
          {orderedTasks.map((task, index) => {
            const progress = repairTaskProgress(task);
            return (
              <div key={task.id ?? `${task.isla}-${task.operacion}-${index}`} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{task.isla}</p>
                    <p className="mt-1 text-sm text-gray-600">{task.operacion || 'Operación por definir'}</p>
                    <p className="mt-1 text-xs text-gray-500">{task.tecnico || 'Técnico sin asignar'}</p>
                  </div>
                  <span className={`rounded px-2 py-1 text-xs font-medium ${repairStatusClass(task.estado)}`}>
                    {task.estado ?? 'PENDIENTE'}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2">
                  <span>Inicio planificado: {formatDateTime(task.fecha_inicio_planificada)}</span>
                  <span>Fin planificado: {formatDateTime(task.fecha_fin_planificada)}</span>
                  {task.fecha_inicio_real ? <span>Inicio real: {formatDateTime(task.fecha_inicio_real)}</span> : null}
                  {task.fecha_fin_real ? <span>Fin real: {formatDateTime(task.fecha_fin_real)}</span> : null}
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-gray-500">{progress.label}</span>
                    <span className="font-medium text-gray-900">{progress.percent}%</span>
                  </div>
                  <Progress value={progress.percent} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RepairTimeManagementPanel tasks={orderedTasks} />
    </div>
  );
}

function RepairTimeManagementPanel({ tasks }: { tasks: MockOrderProcess['tareas'] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <p className="text-sm font-medium text-gray-900">Gestión de tiempos por isla</p>
        <p className="mt-1 text-xs text-gray-500">Lectura operativa de inicio, pausas, reanudaciones y finalización registradas desde la pantalla de isla.</p>
      </div>
      <div className="divide-y divide-gray-100">
        {tasks.map((task, index) => {
          const timing = repairTimingSummary(task);
          return (
            <div key={task.id ?? `${task.isla}-tiempos-${index}`} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{task.isla}</p>
                  <p className="mt-1 text-sm text-gray-600">{task.operacion || 'Operación por definir'}</p>
                </div>
                <span className={`rounded px-2 py-1 text-xs font-medium ${repairStatusClass(task.estado)}`}>
                  {task.estado ?? 'PENDIENTE'}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <RepairMetric title="Tiempo activo" value={formatDuration(timing.activeMs)} detail={timing.activeLabel} />
                <RepairMetric title="Tiempo pausado" value={formatDuration(timing.pausedMs)} detail={`${timing.pauseCount} pausa(s)`} />
                <RepairMetric title="Tiempo total" value={formatDuration(timing.totalMs)} detail={timing.totalLabel} />
              </div>

              {timing.events.length > 0 ? (
                <div className="mt-4 rounded-lg bg-gray-50 p-3">
                  <p className="text-xs font-medium uppercase text-gray-500">Bitácora operativa</p>
                  <div className="mt-3 space-y-2">
                    {timing.events.map((event, eventIndex) => (
                      <div key={`${event.fecha_hora}-${eventIndex}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${repairActionClass(event.accion)}`}>
                            {event.accion}
                          </span>
                          <span className="text-gray-600">{event.observacion || event.estado_resultante}</span>
                        </div>
                        <span className="text-xs text-gray-500">{formatDateTime(event.fecha_hora)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                  Aún no hay eventos operativos. El historial aparecerá cuando el operario inicie la tarea desde la pantalla de isla.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RepairMetric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase text-gray-500">{title}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

function repairTaskProgress(task: MockOrderProcess['tareas'][number]) {
  if (task.estado === 'COMPLETADA' || task.fecha_fin_real) {
    return { percent: 100, label: 'Completada' };
  }

  const plannedStart = new Date(task.fecha_inicio_planificada).getTime();
  const plannedEnd = new Date(task.fecha_fin_planificada).getTime();
  const now = Date.now();

  if (!Number.isFinite(plannedStart) || !Number.isFinite(plannedEnd) || plannedEnd <= plannedStart) {
    return { percent: task.estado === 'EN_PROCESO' ? 50 : 0, label: 'Sin ventana válida' };
  }

  if (now <= plannedStart && !task.fecha_inicio_real) {
    return { percent: 0, label: 'Pendiente según planificación' };
  }

  const elapsed = Math.max(0, now - plannedStart);
  const duration = plannedEnd - plannedStart;
  const percent = Math.min(100, Math.round((elapsed / duration) * 100));
  const label = now > plannedEnd ? 'Tiempo planificado vencido' : task.estado === 'EN_PROCESO' ? 'En ejecución' : 'Avance por calendario';

  return { percent, label };
}

function repairTimingSummary(task: MockOrderProcess['tareas'][number]) {
  const events = (task.eventos ?? [])
    .slice()
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
  const now = Date.now();
  let activeStartedAt: number | null = null;
  let pauseStartedAt: number | null = null;
  let activeMs = 0;
  let pausedMs = 0;
  let pauseCount = 0;

  for (const event of events) {
    const eventTime = new Date(event.fecha_hora).getTime();
    if (!Number.isFinite(eventTime)) continue;

    if (event.accion === 'INICIAR' || event.accion === 'REANUDAR') {
      if (pauseStartedAt !== null) {
        pausedMs += Math.max(0, eventTime - pauseStartedAt);
        pauseStartedAt = null;
      }
      activeStartedAt = eventTime;
    }

    if (event.accion === 'PAUSAR') {
      if (activeStartedAt !== null) {
        activeMs += Math.max(0, eventTime - activeStartedAt);
        activeStartedAt = null;
      }
      pauseStartedAt = eventTime;
      pauseCount += 1;
    }

    if (event.accion === 'FINALIZAR') {
      if (activeStartedAt !== null) {
        activeMs += Math.max(0, eventTime - activeStartedAt);
        activeStartedAt = null;
      }
      if (pauseStartedAt !== null) {
        pausedMs += Math.max(0, eventTime - pauseStartedAt);
        pauseStartedAt = null;
      }
    }
  }

  if (activeStartedAt !== null && task.estado === 'EN_PROCESO') {
    activeMs += Math.max(0, now - activeStartedAt);
  }

  if (pauseStartedAt !== null && task.estado === 'PAUSADA') {
    pausedMs += Math.max(0, now - pauseStartedAt);
  }

  const firstStart = events.find((event) => event.accion === 'INICIAR')?.fecha_hora ?? task.fecha_inicio_real;
  const end = task.fecha_fin_real ?? events.findLast((event) => event.accion === 'FINALIZAR')?.fecha_hora;
  const firstStartMs = firstStart ? new Date(firstStart).getTime() : null;
  const endMs = end ? new Date(end).getTime() : null;
  const totalMs = firstStartMs && Number.isFinite(firstStartMs)
    ? Math.max(0, (endMs && Number.isFinite(endMs) ? endMs : now) - firstStartMs)
    : 0;

  return {
    events,
    activeMs,
    pausedMs,
    totalMs,
    pauseCount,
    activeLabel: task.estado === 'EN_PROCESO' ? 'Contando ahora' : 'Acumulado',
    totalLabel: end ? 'Cerrado' : firstStart ? 'Desde inicio real' : 'Sin inicio real',
  };
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function repairProgressSummary(tasks: MockOrderProcess['tareas']) {
  const progresses = tasks.map((task) => repairTaskProgress(task).percent);
  const total = tasks.length;
  const completed = tasks.filter((task) => task.estado === 'COMPLETADA' || task.fecha_fin_real).length;
  const inProgress = tasks.filter((task) => task.estado === 'EN_PROCESO').length;
  const overdueCount = tasks.filter((task) => {
    const plannedEnd = new Date(task.fecha_fin_planificada).getTime();
    return Number.isFinite(plannedEnd) && Date.now() > plannedEnd && task.estado !== 'COMPLETADA' && !task.fecha_fin_real;
  }).length;
  const averageProgress = total > 0 ? Math.round(progresses.reduce((sum, value) => sum + value, 0) / total) : 0;
  const starts = tasks.map((task) => new Date(task.fecha_inicio_planificada).getTime()).filter(Number.isFinite);
  const ends = tasks.map((task) => new Date(task.fecha_fin_planificada).getTime()).filter(Number.isFinite);
  const windowLabel = starts.length > 0 && ends.length > 0
    ? `${formatDateTime(new Date(Math.min(...starts)).toISOString())} - ${formatDateTime(new Date(Math.max(...ends)).toISOString())}`
    : 'Sin fechas';

  return { total, completed, inProgress, overdueCount, averageProgress, windowLabel };
}

function repairStatusClass(status?: string) {
  if (status === 'COMPLETADA') return 'bg-green-100 text-green-700';
  if (status === 'EN_PROCESO') return 'bg-blue-100 text-blue-700';
  if (status === 'PAUSADA') return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

function repairActionClass(action: string) {
  if (action === 'INICIAR' || action === 'REANUDAR') return 'bg-blue-100 text-blue-700';
  if (action === 'PAUSAR') return 'bg-amber-100 text-amber-700';
  if (action === 'FINALIZAR') return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-700';
}

function PhotoUploadPanel({
  title,
  photos,
  isUploading,
  onUpload,
  onSelect,
  onDelete,
}: {
  etapa: OrderPhotoAttachment['etapa'];
  title: string;
  photos: OrderPhotoAttachment[];
  isUploading: boolean;
  onUpload: (files: File[]) => void;
  onSelect: (photo: OrderPhotoAttachment) => void;
  onDelete: (photo: OrderPhotoAttachment) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    const imageFiles = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length > 0) onUpload(imageFiles);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Label>{title}</Label>
          <p className="mt-1 text-xs text-gray-500">{photos.length} foto(s) cargada(s)</p>
        </div>
        <Button type="button" variant="outline" size="sm" disabled={isUploading} onClick={() => inputRef.current?.click()}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          Cargar fotos
        </Button>
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {photos.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {photos.slice(0, 8).map((photo) => (
            <PhotoThumbnail key={photo.id} photo={photo} onSelect={onSelect} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className="mt-4 flex min-h-28 items-center justify-center rounded-md bg-gray-50 text-center text-sm text-gray-500">
          <div>
            <ImagePlus className="mx-auto mb-2 h-5 w-5 text-gray-400" />
            Sube una o varias fotos
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoGalleryCard({
  photos,
  isLoading,
  error,
  pieces,
  onSelect,
  onDelete,
}: {
  photos: OrderPhotoAttachment[];
  isLoading: boolean;
  error: string;
  pieces: string[];
  onSelect: (photo: OrderPhotoAttachment) => void;
  onDelete: (photo: OrderPhotoAttachment) => void;
}) {
  const groups = photoGalleryGroups(photos, pieces);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Galería de fotos</CardTitle>
          <p className="mt-1 text-sm text-gray-600">Agrupada por pieza afectada y etapa.</p>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 rounded-md bg-gray-50 p-4 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando fotos...
          </div>
        ) : groups.length > 0 ? (
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.title} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{group.title}</p>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{group.photos.length}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.photos.map((photo) => (
                    <PhotoThumbnail key={photo.id} photo={photo} onSelect={onSelect} onDelete={onDelete} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
            <ImagePlus className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-800">Sin fotos cargadas</p>
            <p className="mt-1 text-xs text-gray-500">Agrega evidencia visual de proforma, calidad o entrega.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function photoGalleryGroups(photos: OrderPhotoAttachment[], pieces: string[]) {
  const proformaPhotos = photos.filter((photo) => photo.etapa === 'PROFORMA');
  const normalizedPieces = pieces.map((piece) => piece.trim()).filter(Boolean);
  const groups: Array<{ title: string; photos: OrderPhotoAttachment[] }> = [];
  const usedPhotoIds = new Set<string>();

  for (const piece of normalizedPieces) {
    const piecePhotos = proformaPhotos.filter((photo) => normalizePhotoPiece(photo.pieza) === normalizePhotoPiece(piece));
    if (piecePhotos.length > 0) {
      groups.push({ title: piece, photos: piecePhotos });
      piecePhotos.forEach((photo) => usedPhotoIds.add(photo.id));
    }
  }

  const unassignedProforma = proformaPhotos.filter((photo) => !usedPhotoIds.has(photo.id));
  if (unassignedProforma.length > 0) {
    groups.push({ title: 'Sin pieza asignada', photos: unassignedProforma });
  }

  for (const etapa of ['CALIDAD', 'ENTREGA', 'GENERAL'] as const) {
    const stagePhotos = photos.filter((photo) => photo.etapa === etapa);
    if (stagePhotos.length > 0) {
      groups.push({ title: photoStageLabel(etapa), photos: stagePhotos });
    }
  }

  return groups;
}

function normalizePhotoPiece(value?: string) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function PhotoThumbnail({
  photo,
  onSelect,
  onDelete,
}: {
  photo: OrderPhotoAttachment;
  onSelect: (photo: OrderPhotoAttachment) => void;
  onDelete: (photo: OrderPhotoAttachment) => void;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100">
      <img src={photo.url} alt={photo.nombre} className="h-full w-full object-cover" loading="lazy" />
      <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
        {photoStageLabel(photo.etapa)}
      </div>
      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
        <Button type="button" variant="secondary" size="icon" aria-label="Ver foto" onClick={() => onSelect(photo)}>
          <Eye className="h-4 w-4" />
        </Button>
        <Button type="button" variant="destructive" size="icon" aria-label="Eliminar foto" onClick={() => onDelete(photo)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PhotoPreviewDialog({
  photo,
  onOpenChange,
  onDelete,
}: {
  photo: OrderPhotoAttachment | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (photo: OrderPhotoAttachment) => void;
}) {
  return (
    <Dialog open={Boolean(photo)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
        {photo ? (
          <div className="grid max-h-[90vh] grid-cols-1 md:grid-cols-[1fr_260px]">
            <div className="flex min-h-80 items-center justify-center bg-black">
              <img src={photo.url} alt={photo.nombre} className="max-h-[90vh] w-full object-contain" />
            </div>
            <div className="space-y-4 overflow-y-auto p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-gray-500">{photoStageLabel(photo.etapa)}</p>
                  <DialogTitle className="mt-1 break-words text-lg">{photo.nombre}</DialogTitle>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Cerrar visor" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-600">Cargada el {formatDateTime(photo.created_at)}</p>
              <Button type="button" variant="destructive" className="w-full" onClick={() => onDelete(photo)}>
                <Trash2 className="h-4 w-4" />
                Eliminar foto
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function photoStageLabel(etapa: OrderPhotoAttachment['etapa']) {
  const labels: Record<OrderPhotoAttachment['etapa'], string> = {
    PROFORMA: 'Proforma',
    CALIDAD: 'Calidad',
    ENTREGA: 'Entrega',
    GENERAL: 'General',
  };

  return labels[etapa];
}

function SavedDataSummary({ process }: { process: MockOrderProcess }) {
  const aprobacion = process.aseguradora;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos registrados</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <SummaryBox title="Piezas" value={`${process.proforma.length} pieza(s)`} detail={process.proforma.at(-1)?.pieza} />
        <SummaryBox
          title="Aprobación"
          value={aprobacion.estado ?? 'PENDIENTE_ENVIO'}
          detail={[
            aprobacion.fecha_envio ? `Envío: ${aprobacion.fecha_envio}` : '',
            aprobacion.fecha_aprobacion ? `Aprobación: ${aprobacion.fecha_aprobacion}` : '',
            aprobacion.observaciones,
          ].filter(Boolean).join(' · ')}
        />
        <SummaryBox title="Repuestos" value={`${process.repuestos.length} repuesto(s)`} detail={process.repuestos.at(-1)?.descripcion} />
        <SummaryBox title="Planificación" value={`${process.tareas.length} tarea(s)`} detail={process.tareas.at(-1)?.operacion} />
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
    tipo_cliente: 'Tipo de cliente',
    estado_aprobacion: 'Estado aprobación',
    observaciones_aprobacion: 'Observaciones aprobación',
    descripcion_repuesto: 'Repuesto',
    cantidad_repuesto: 'Cantidad',
    estado_repuesto: 'Estado repuesto',
    costo_repuesto: 'Costo repuesto',
    foto_url_pieza: 'Foto pieza',
    observacion_pieza: 'Observación pieza',
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
