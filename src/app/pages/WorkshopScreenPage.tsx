import { Monitor, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { matchesSucursalScope, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { formatDateTime } from '@/app/lib/format';
import { useMockOrderProcesses, useMockOrders } from '@/app/store/mockOrders';

const islands = ['Enderezada', 'Pintura', 'Mecanica', 'Calidad'];

export function WorkshopScreenPage() {
  const orders = useMockOrders();
  const processes = useMockOrderProcesses();
  const sucursalScope = useSucursalScope();
  const tasks = orders
    .filter((order) => order.estado === 'INICIO_REPARACION' && matchesSucursalScope(order.sucursal_id, sucursalScope.effectiveSucursalId))
    .flatMap((order) => {
      const process = processes[order.id];
      return (process?.tareas ?? []).map((task, index) => ({
        ...task,
        taskIndex: index,
        orden_id: order.id,
        numero_orden: order.numero_orden,
        placa: order.placa,
        vehiculo: `${order.marca} ${order.modelo}`,
        sucursal_id: order.sucursal_id,
      }));
    });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={Monitor}
        title="Pantalla principal del taller"
        description="Vista proyectable para visualizar el vehiculo actual, el proximo trabajo y el estado operativo por isla."
        action={<Button variant="outline"><RefreshCcw className="h-4 w-4" />Actualizar</Button>}
      />

      <Card className="mb-4">
        <CardContent className="p-4">
          <SucursalScopeControl
            isAdmin={sucursalScope.isAdmin}
            sucursales={sucursalScope.sucursales}
            selectedSucursalId={sucursalScope.selectedSucursalId}
            selectedSucursalName={sucursalScope.selectedSucursalName}
            onSucursalChange={sucursalScope.setSelectedSucursalId}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        {islands.map((isla) => {
          const islandTasks = tasks
            .filter((task) => task.isla === isla && task.estado !== 'COMPLETADA')
            .sort((a, b) => dateValue(a.fecha_inicio_planificada) - dateValue(b.fecha_inicio_planificada));
          const currentTask = islandTasks.find((task) => task.estado === 'EN_PROCESO' || task.estado === 'PAUSADA') ?? islandTasks[0];
          const nextTask = islandTasks.find((task) => task !== currentTask);
          const signal = currentTask
            ? signalForTask(currentTask.fecha_inicio_planificada, currentTask.fecha_fin_planificada, currentTask.estado)
            : 'proximo';

          return (
            <Card key={isla} className="min-h-72">
              <CardContent className="flex h-full flex-col justify-between p-6">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-500">Isla</p>
                      <h2 className="text-2xl text-gray-950">{isla}</h2>
                    </div>
                    {currentTask ? <StatusBadge signal={signal} /> : null}
                  </div>

                  <div className="mt-8">
                    <p className="text-sm text-gray-500">Vehiculo actual</p>
                    {currentTask ? (
                      <>
                        <p className="mt-1 text-4xl font-semibold text-gray-950">{currentTask.placa}</p>
                        <p className="mt-2 text-base text-gray-600">{currentTask.vehiculo}</p>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-3xl font-semibold text-gray-400">Sin asignar</p>
                        <p className="mt-2 text-base text-gray-600">No hay trabajos en cola.</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs uppercase text-gray-500">Operacion</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">{currentTask?.operacion ?? 'Sin operacion activa'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Inicio planificado</p>
                      <p className="font-medium text-gray-900">{formatDateTime(currentTask?.fecha_inicio_planificada)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Fin planificado</p>
                      <p className="font-medium text-gray-900">{formatDateTime(currentTask?.fecha_fin_planificada)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Tecnico</p>
                      <p className="font-medium text-gray-900">{currentTask?.tecnico || 'Sin tecnico'}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="text-xs uppercase text-gray-500">Proximo vehiculo</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {nextTask ? `${nextTask.placa} · ${nextTask.operacion}` : 'Sin siguiente trabajo'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function dateValue(value?: string) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
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
