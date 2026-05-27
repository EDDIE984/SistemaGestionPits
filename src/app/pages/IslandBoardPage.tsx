import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, SquareCheckBig, Wrench } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { ALL_SUCURSALES, matchesSucursalScope, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { formatDateTime, formatMoney } from '@/app/lib/format';
import { fetchAllIslas, fetchIslas } from '@/app/services/configService';
import type { IslaOption } from '@/app/services/configService';
import { updateMockIslandTask, useMockOrderProcesses, useMockOrders } from '@/app/store/mockOrders';

const ALL_VALUE = '__all__';

export function IslandBoardPage() {
  const sucursalScope = useSucursalScope();
  const orders = useMockOrders();
  const processes = useMockOrderProcesses();
  const [islas, setIslas] = useState<IslaOption[]>([]);
  const [isLoadingIslas, setIsLoadingIslas] = useState(true);
  const [selectedIslaId, setSelectedIslaId] = useState(ALL_VALUE);

  useEffect(() => {
    setSelectedIslaId(ALL_VALUE);
    setIsLoadingIslas(true);

    if (sucursalScope.effectiveSucursalId === ALL_SUCURSALES) {
      fetchAllIslas()
        .then(setIslas)
        .catch(() => setIslas([]))
        .finally(() => setIsLoadingIslas(false));
      return;
    }

    if (!sucursalScope.effectiveSucursalId) {
      setIslas([]);
      setIsLoadingIslas(false);
      return;
    }

    fetchIslas(sucursalScope.effectiveSucursalId)
      .then(setIslas)
      .catch(() => setIslas([]))
      .finally(() => setIsLoadingIslas(false));
  }, [sucursalScope.effectiveSucursalId]);

  const selectedIsla = useMemo(
    () => islas.find((isla) => isla.id === selectedIslaId),
    [islas, selectedIslaId],
  );

  const tasks = useMemo(() => orders
    .filter((order) => {
      const statusMatches = order.estado === 'INICIO_REPARACION' || order.estado === 'EN_PROCESO_ISLAS';
      const sucursalMatches = matchesSucursalScope(order.sucursal_id, sucursalScope.effectiveSucursalId);
      return statusMatches && sucursalMatches;
    })
    .flatMap((order) => {
      const process = processes[order.id];
      return (process?.tareas ?? []).map((task) => ({
        ...task,
        orden_id: order.id,
        numero_orden: order.numero_orden,
        sucursal_id: order.sucursal_id,
        sucursal: order.sucursal,
        placa: order.placa,
        vehiculo: `${order.marca} ${order.modelo}`,
      }));
    })
    .filter((task) => selectedIslaId === ALL_VALUE || task.isla === selectedIsla?.nombre), [orders, processes, selectedIsla?.nombre, selectedIslaId, sucursalScope.effectiveSucursalId]);

  const islandsToDisplay = useMemo(() => {
    const byName = new Map<string, { id: string; nombre: string }>();

    islas
      .filter((isla) => selectedIslaId === ALL_VALUE || isla.id === selectedIslaId)
      .forEach((isla) => {
      byName.set(isla.nombre, isla);
    });

    tasks.forEach((task) => {
      if (task.isla && !byName.has(task.isla)) {
        byName.set(task.isla, { id: task.isla, nombre: task.isla });
      }
    });

    return Array.from(byName.values());
  }, [islas, selectedIslaId, tasks]);

  const tasksByIsland = useMemo(() => {
    const groups = new Map<string, typeof tasks>();
    islandsToDisplay.forEach((isla) => groups.set(isla.nombre, []));

    tasks.forEach((task) => {
      const islandName = task.isla || 'Sin isla';
      groups.set(islandName, [...(groups.get(islandName) ?? []), task]);
    });

    return groups;
  }, [islandsToDisplay, tasks]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={Wrench}
        title="Operacion por isla"
        description="Panel de trabajo para iniciar, pausar, reanudar y finalizar tareas asignadas desde planificacion."
      />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_280px] md:items-center">
          <SucursalScopeControl
            isAdmin={sucursalScope.isAdmin}
            sucursales={sucursalScope.sucursales}
            selectedSucursalId={sucursalScope.selectedSucursalId}
            selectedSucursalName={sucursalScope.selectedSucursalName}
            onSucursalChange={sucursalScope.setSelectedSucursalId}
          />

          <Select value={selectedIslaId} onValueChange={setSelectedIslaId}>
            <SelectTrigger>
              <SelectValue placeholder="Isla" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todas las islas</SelectItem>
              {islas.map((isla) => (
                <SelectItem key={isla.id} value={isla.id}>{isla.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoadingIslas ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <Wrench className="h-10 w-10 text-gray-400" />
            <h2 className="mt-4 text-xl text-gray-900">Cargando islas</h2>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {islandsToDisplay.length === 0 ? (
            <Card className="xl:col-span-2">
              <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                <Wrench className="h-10 w-10 text-gray-400" />
                <h2 className="mt-4 text-xl text-gray-900">No hay islas configuradas</h2>
                <p className="mt-2 max-w-xl text-sm text-gray-600">
                  Configura islas activas para la sucursal actual desde Configuracion &gt; Islas.
                </p>
              </CardContent>
            </Card>
          ) : islandsToDisplay.map((isla) => {
            const islandTasks = tasksByIsland.get(isla.nombre) ?? [];

            return (
              <Card key={isla.id} className="h-fit overflow-hidden">
                <CardHeader className="border-b border-gray-100 bg-white">
                  <div className="flex items-center justify-between gap-4">
                    <CardTitle>{isla.nombre}</CardTitle>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                      {islandTasks.length} tareas
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {islandTasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
                      Sin tareas listas para esta isla.
                    </div>
                  ) : islandTasks.map((task) => {
                    const taskId = task.id ?? '';
                    const taskStatus = task.estado ?? 'PENDIENTE';
                    const signal = signalForTask(task.fecha_inicio_planificada, task.fecha_fin_planificada, taskStatus);
                    const estimatedCost = Number(task.tiempo_estandar_horas || 0) * Number(task.tarifa_hora || 0);

                    return (
                      <div key={`${task.orden_id}-${taskId}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <div className={`h-1 ${signalClass(signal)}`} />
                        <div className="space-y-4 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium text-gray-900">{task.operacion}</p>
                              <p className="mt-1 text-sm text-gray-600">{task.numero_orden} · {task.placa}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <StatusBadge signal={signal} />
                              <StatusBadge taskStatus={taskStatus} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <InfoBox label="Vehiculo" value={`${task.placa} · ${task.vehiculo}`} />
                            <InfoBox label="Tecnico" value={task.tecnico || 'Sin tecnico'} />
                            <InfoBox label="Costo estimado" value={formatMoney(estimatedCost)} />
                            <InfoBox label="Estandar" value={`${task.tiempo_estandar_horas}h`} />
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            <span>Inicio: {formatDateTime(task.fecha_inicio_planificada)}</span>
                            <span>Fin: {formatDateTime(task.fecha_fin_planificada)}</span>
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
                        </div>
                      </div>
                    );
                  })}
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
