import { Pause, Play, SquareCheckBig, Wrench } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatDateTime, formatMoney } from '@/app/lib/format';
import { updateMockIslandTask, useMockOrderProcesses, useMockOrders } from '@/app/store/mockOrders';

export function IslandBoardPage() {
  const orders = useMockOrders();
  const processes = useMockOrderProcesses();
  const tasks = orders
    .filter((order) => order.estado === 'INICIO_REPARACION')
    .flatMap((order) => {
      const process = processes[order.id];
      return (process?.tareas ?? []).map((task) => ({
        ...task,
        orden_id: order.id,
        numero_orden: order.numero_orden,
        placa: order.placa,
        vehiculo: `${order.marca} ${order.modelo}`,
      }));
    });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={Wrench}
        title="Operacion por isla"
        description="Panel de trabajo para iniciar, pausar, reanudar y finalizar tareas asignadas desde planificacion."
      />

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <Wrench className="h-10 w-10 text-gray-400" />
            <h2 className="mt-4 text-xl text-gray-900">No hay tareas listas para islas</h2>
            <p className="mt-2 max-w-xl text-sm text-gray-600">
              Cuando una orden llegue a Inicio reparacion y tenga tareas planificadas por isla, aparecera aqui para que el operario pueda iniciarla y finalizarla.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {tasks.map((task) => {
            const taskId = task.id ?? '';
            const taskStatus = task.estado ?? 'PENDIENTE';
            const signal = signalForTask(task.fecha_inicio_planificada, task.fecha_fin_planificada, taskStatus);
            const estimatedCost = Number(task.tiempo_estandar_horas || 0) * Number(task.tarifa_hora || 0);

            return (
              <Card key={`${task.orden_id}-${taskId}`} className="overflow-hidden">
                <div className={`h-1 ${signalClass(signal)}`} />
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{task.isla}</CardTitle>
                      <p className="mt-1 text-sm text-gray-600">{task.operacion}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadge signal={signal} />
                      <StatusBadge taskStatus={taskStatus} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoBox label="Orden" value={task.numero_orden} />
                    <InfoBox label="Vehiculo" value={`${task.placa} · ${task.vehiculo}`} />
                    <InfoBox label="Tecnico" value={task.tecnico || 'Sin tecnico'} />
                    <InfoBox label="Costo estimado" value={formatMoney(estimatedCost)} />
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span>Inicio: {formatDateTime(task.fecha_inicio_planificada)}</span>
                    <span>Fin: {formatDateTime(task.fecha_fin_planificada)}</span>
                    <span>Estandar: {task.tiempo_estandar_horas}h</span>
                  </div>

                  {task.fecha_inicio_real || task.fecha_fin_real ? (
                    <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                      {task.fecha_inicio_real ? <span>Inicio real: {formatDateTime(task.fecha_inicio_real)}</span> : null}
                      {task.fecha_fin_real ? <span>Fin real: {formatDateTime(task.fecha_fin_real)}</span> : null}
                    </div>
                  ) : null}

                  {task.eventos?.length ? (
                    <div className="rounded-lg bg-gray-50 p-3 text-sm">
                      <p className="font-medium text-gray-900">Historial operativo</p>
                      <div className="mt-2 space-y-1 text-gray-600">
                        {task.eventos.slice(-3).map((event, index) => (
                          <p key={`${event.fecha_hora}-${index}`}>
                            {event.accion}: {formatDateTime(event.fecha_hora)}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!taskId || taskStatus === 'EN_PROCESO' || taskStatus === 'COMPLETADA'}
                      onClick={() => { void updateMockIslandTask(task.orden_id, taskId, 'INICIAR'); }}
                    >
                      <Play className="h-4 w-4" />
                      {taskStatus === 'PAUSADA' ? 'Reanudar' : 'Iniciar'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!taskId || taskStatus !== 'EN_PROCESO'}
                      onClick={() => { void updateMockIslandTask(task.orden_id, taskId, 'PAUSAR'); }}
                    >
                      <Pause className="h-4 w-4" />
                      Pausar
                    </Button>
                    <Button
                      size="sm"
                      disabled={!taskId || taskStatus === 'COMPLETADA'}
                      onClick={() => { void updateMockIslandTask(task.orden_id, taskId, 'FINALIZAR'); }}
                    >
                      <SquareCheckBig className="h-4 w-4" />
                      Finalizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{value}</p>
    </div>
  );
}

function signalForTask(start?: string, end?: string, status?: string) {
  if (status === 'COMPLETADA') return 'a-tiempo' as const;
  const now = Date.now();
  const startTime = start ? new Date(start).getTime() : 0;
  const endTime = end ? new Date(end).getTime() : 0;

  if (startTime && now < startTime) return 'proximo' as const;
  if (endTime && now > endTime) return 'atrasado' as const;
  if (startTime && endTime) {
    const total = endTime - startTime;
    const remaining = endTime - now;
    if (total > 0 && remaining / total <= 0.2) return 'por-vencer' as const;
  }

  return 'a-tiempo' as const;
}

function signalClass(signal: 'a-tiempo' | 'por-vencer' | 'atrasado' | 'proximo') {
  if (signal === 'atrasado') return 'bg-red-500';
  if (signal === 'por-vencer') return 'bg-yellow-500';
  if (signal === 'proximo') return 'bg-blue-500';
  return 'bg-green-500';
}
