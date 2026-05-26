import { useEffect, useState } from 'react';
import { SlidersHorizontal, Save } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { formatDateTime, formatMoney } from '@/app/lib/format';
import { modifyMockIslandTask, useMockOrderProcesses, useMockOrders } from '@/app/store/mockOrders';

interface ModificationForm {
  tecnico: string;
  tiempo_estandar_horas: string;
  tarifa_hora: string;
  fecha_inicio_planificada: string;
  fecha_fin_planificada: string;
  motivo_ajuste: string;
  observaciones: string;
}

export function ModificationsPage() {
  const orders = useMockOrders();
  const processes = useMockOrderProcesses();
  const tasks = orders.flatMap((order) => {
    const process = processes[order.id];
    return (process?.tareas ?? []).map((task) => ({
      ...task,
      orden_id: order.id,
      numero_orden: order.numero_orden,
      placa: order.placa,
      vehiculo: `${order.marca} ${order.modelo}`,
      estado_orden: order.estado,
    }));
  });

  const [selectedTaskId, setSelectedTaskId] = useState('');
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const [form, setForm] = useState<ModificationForm>({
    tecnico: '',
    tiempo_estandar_horas: '',
    tarifa_hora: '',
    fecha_inicio_planificada: '',
    fecha_fin_planificada: '',
    motivo_ajuste: '',
    observaciones: '',
  });
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!selectedTaskId && tasks[0]?.id) {
      setSelectedTaskId(tasks[0].id);
    }
  }, [selectedTaskId, tasks]);

  useEffect(() => {
    if (!selectedTask) return;

    setForm({
      tecnico: selectedTask.tecnico || '',
      tiempo_estandar_horas: String(selectedTask.tiempo_estandar_horas || ''),
      tarifa_hora: String(selectedTask.tarifa_hora || ''),
      fecha_inicio_planificada: toInputDateTime(selectedTask.fecha_inicio_planificada),
      fecha_fin_planificada: toInputDateTime(selectedTask.fecha_fin_planificada),
      motivo_ajuste: selectedTask.motivo_ajuste || '',
      observaciones: selectedTask.observaciones || '',
    });
  }, [selectedTaskId]);

  const updateField = (field: keyof ModificationForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async () => {
    if (!selectedTask?.id) return;

    await modifyMockIslandTask(selectedTask.orden_id, selectedTask.id, {
      tecnico: form.tecnico,
      tiempo_estandar_horas: Number(form.tiempo_estandar_horas || 0),
      tarifa_hora: Number(form.tarifa_hora || 0),
      fecha_inicio_planificada: form.fecha_inicio_planificada,
      fecha_fin_planificada: form.fecha_fin_planificada,
      motivo_ajuste: form.motivo_ajuste,
      observaciones: form.observaciones,
    });
    setNotice('Modificacion guardada correctamente.');
    window.setTimeout(() => setNotice(''), 2800);
  };

  const estimatedCost = Number(form.tiempo_estandar_horas || 0) * Number(form.tarifa_hora || 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={SlidersHorizontal}
        title="Modificaciones"
        description="Ajusta tareas planificadas, reasigna tecnico, cambia fechas o tarifa y deja historial para auditoria."
      />

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-gray-600">
            No hay tareas planificadas para modificar. Crea una planificacion desde el detalle de una orden.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Tareas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.map((task) => {
                const isSelected = task.id === selectedTaskId;
                return (
                  <button
                    key={task.id ?? `${task.orden_id}-${task.operacion}`}
                    type="button"
                    onClick={() => setSelectedTaskId(task.id ?? '')}
                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{task.numero_orden} · {task.placa}</p>
                    <p className="mt-1 text-sm text-gray-600">{task.isla} · {task.operacion}</p>
                    <p className="mt-2 text-xs text-gray-500">{formatDateTime(task.fecha_inicio_planificada)} - {formatDateTime(task.fecha_fin_planificada)}</p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle de modificacion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {notice ? (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  {notice}
                </div>
              ) : null}

              {selectedTask ? (
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-900">{selectedTask.numero_orden} · {selectedTask.vehiculo}</p>
                  <p className="mt-1 text-sm text-gray-600">{selectedTask.isla} · {selectedTask.operacion}</p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Tecnico" value={form.tecnico} onChange={(value) => updateField('tecnico', value)} />
                <Field label="Tiempo estandar horas" type="number" value={form.tiempo_estandar_horas} onChange={(value) => updateField('tiempo_estandar_horas', value)} />
                <Field label="Tarifa hora" type="number" value={form.tarifa_hora} onChange={(value) => updateField('tarifa_hora', value)} />
                <Field label="Costo estimado" value={formatMoney(estimatedCost)} onChange={() => undefined} disabled />
                <Field label="Inicio planificado" type="datetime-local" value={form.fecha_inicio_planificada} onChange={(value) => updateField('fecha_inicio_planificada', value)} />
                <Field label="Fin planificado" type="datetime-local" value={form.fecha_fin_planificada} onChange={(value) => updateField('fecha_fin_planificada', value)} />
              </div>

              <div className="space-y-2">
                <Label>Motivo del ajuste</Label>
                <Textarea rows={3} value={form.motivo_ajuste} onChange={(event) => updateField('motivo_ajuste', event.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Observaciones</Label>
                <Textarea rows={3} value={form.observaciones} onChange={(event) => updateField('observaciones', event.target.value)} />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => { void handleSave(); }} disabled={!selectedTask?.id}>
                  <Save className="h-4 w-4" />
                  Guardar modificacion
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function toInputDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
