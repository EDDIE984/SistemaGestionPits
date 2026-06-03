import { useEffect, useMemo, useState } from 'react';
import { Monitor, RefreshCcw } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { matchesSucursalScope, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { formatDateTime, signalLabel } from '@/app/lib/format';
import { refreshOrders, refreshProcesses, useMockOrderProcesses, useMockOrders } from '@/app/store/mockOrders';

const ALL_ISLANDS = '__all__';
const islands = ['Enderezada', 'Pintura', 'Mecanica', 'Calidad'];
const WORKSHOP_REFRESH_MS = 30 * 60 * 1000;

export function WorkshopScreenPage() {
  const orders = useMockOrders();
  const processes = useMockOrderProcesses();
  const sucursalScope = useSucursalScope();
  const [selectedIsland, setSelectedIsland] = useState(ALL_ISLANDS);
  const [lastRefreshAt, setLastRefreshAt] = useState(() => new Date());

  const refreshWorkshopScreen = () => {
    refreshOrders();
    refreshProcesses();
    setLastRefreshAt(new Date());
  };

  useEffect(() => {
    const intervalId = window.setInterval(refreshWorkshopScreen, WORKSHOP_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, []);

  const tasks = useMemo(() => orders
    .filter((order) => (order.estado === 'INICIO_REPARACION' || order.estado === 'EN_PROCESO_ISLAS') && matchesSucursalScope(order.sucursal_id, sucursalScope.effectiveSucursalId))
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
    }), [orders, processes, sucursalScope.effectiveSucursalId]);

  const islandsWithTasks = useMemo(() => {
    const names = new Set(tasks.filter((task) => task.estado !== 'COMPLETADA').map((task) => task.isla).filter(Boolean));
    return islands.filter((isla) => names.has(isla));
  }, [tasks]);
  const visibleIslands = selectedIsland === ALL_ISLANDS ? islandsWithTasks : islandsWithTasks.filter((isla) => isla === selectedIsland);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={Monitor}
        title="Pantalla principal del taller"
        description="Vista proyectable para visualizar el vehiculo actual, el proximo trabajo y el estado operativo por isla."
        action={(
          <Button variant="outline" onClick={refreshWorkshopScreen}>
            <RefreshCcw className="h-4 w-4" />
            Actualizar
          </Button>
        )}
      />

      <Card className="mb-4">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[1fr_260px_190px] lg:items-end">
          <SucursalScopeControl
            isAdmin={sucursalScope.isAdmin}
            sucursales={sucursalScope.sucursales}
            selectedSucursalId={sucursalScope.selectedSucursalId}
            selectedSucursalName={sucursalScope.selectedSucursalName}
            onSucursalChange={sucursalScope.setSelectedSucursalId}
          />
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Isla</p>
            <Select value={selectedIsland} onValueChange={setSelectedIsland}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ISLANDS}>Todas las islas</SelectItem>
                {islands.map((isla) => (
                  <SelectItem key={isla} value={isla}>{isla}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
            <p className="text-xs uppercase text-gray-500">Última actualización</p>
            <p className="mt-1 font-medium text-gray-900">{formatDateTime(lastRefreshAt.toISOString())}</p>
          </div>
        </CardContent>
      </Card>

      {visibleIslands.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
            <Monitor className="h-10 w-10 text-gray-400" />
            <p className="mt-3 text-lg font-medium text-gray-900">Sin trabajos activos para mostrar</p>
            <p className="mt-1 max-w-xl text-sm text-gray-600">
              La pantalla solo muestra tareas de ordenes en Inicio de reparacion o En islas. Las ordenes que aun estan en planificacion no aparecen aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 gap-5 ${visibleIslands.length === 1 ? 'xl:grid-cols-1' : 'xl:grid-cols-4'}`}>
          {visibleIslands.map((isla) => {
          const islandTasks = tasks
            .filter((task) => task.isla === isla && task.estado !== 'COMPLETADA')
            .sort((a, b) => dateValue(a.fecha_inicio_planificada) - dateValue(b.fecha_inicio_planificada));
          const taskSlots = workshopTaskSlots(islandTasks);
          const signal = taskSlots.overdue ? 'atrasado' : taskSlots.active ? signalForTask(taskSlots.active.fecha_inicio_planificada, taskSlots.active.fecha_fin_planificada, taskSlots.active.estado) : 'proximo';
          const cardTone = workshopCardTone(signal);

          return (
            <Card key={isla} className={`min-h-72 overflow-hidden border-2 shadow-sm ${cardTone.card}`}>
              <div className={`h-2 ${cardTone.bar}`} />
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm ${cardTone.mutedText}`}>Isla</p>
                    <h2 className={`text-2xl ${cardTone.heading}`}>{isla}</h2>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge signal={signal} />
                    <span className={`rounded-md px-3 py-1 text-xs font-semibold uppercase tracking-wide ${cardTone.statusPill}`}>
                      {signalLabel(signal)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <WorkshopTaskBlock
                    title="Trabajo atrasado"
                    task={taskSlots.overdue}
                    tone={taskSlots.overdue ? workshopCardTone('atrasado') : cardTone}
                    emptyText="Sin atrasos"
                    emphasis={Boolean(taskSlots.overdue)}
                  />
                  <WorkshopTaskBlock
                    title="En ejecución"
                    task={taskSlots.active}
                    tone={taskSlots.active ? workshopCardTone(signalForTask(taskSlots.active.fecha_inicio_planificada, taskSlots.active.fecha_fin_planificada, taskSlots.active.estado)) : cardTone}
                    emptyText="Sin trabajo activo"
                    emphasis={Boolean(taskSlots.active)}
                  />
                  <WorkshopTaskBlock
                    title="Próximo trabajo"
                    task={taskSlots.next}
                    tone={taskSlots.next ? workshopCardTone('proximo') : cardTone}
                    emptyText="Sin próximo trabajo"
                    emphasis={Boolean(taskSlots.next)}
                  />
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

function dateValue(value?: string) {
  return value ? new Date(value).getTime() : Number.MAX_SAFE_INTEGER;
}

type WorkshopTask = ReturnType<typeof useMockOrderProcesses>[string]['tareas'][number] & {
  orden_id: string;
  numero_orden: string;
  placa: string;
  vehiculo: string;
  sucursal_id: string;
};

function workshopTaskSlots(tasks: WorkshopTask[]) {
  const active = tasks.find((task) => task.estado === 'EN_PROCESO' || task.estado === 'PAUSADA') ?? null;
  const overdue = tasks.find((task) => signalForTask(task.fecha_inicio_planificada, task.fecha_fin_planificada, task.estado) === 'atrasado') ?? null;
  const next = tasks.find((task) => task !== active && task !== overdue && signalForTask(task.fecha_inicio_planificada, task.fecha_fin_planificada, task.estado) === 'proximo')
    ?? tasks.find((task) => task !== active && task !== overdue)
    ?? null;

  return { active, overdue, next };
}

function WorkshopTaskBlock({
  title,
  task,
  tone,
  emptyText,
  emphasis,
}: {
  title: string;
  task: WorkshopTask | null;
  tone: ReturnType<typeof workshopCardTone>;
  emptyText: string;
  emphasis: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${emphasis ? tone.nextPanel : 'border-gray-200 bg-white/70'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-xs font-semibold uppercase ${emphasis ? tone.mutedText : 'text-gray-500'}`}>{title}</p>
          {task ? (
            <>
              <p className={`mt-1 text-3xl font-semibold ${tone.heading}`}>{task.placa}</p>
              <p className={`mt-1 text-sm ${tone.bodyText}`}>{task.vehiculo}</p>
            </>
          ) : (
            <p className="mt-2 text-lg font-semibold text-gray-400">{emptyText}</p>
          )}
        </div>
        {task ? <StatusBadge signal={signalForTask(task.fecha_inicio_planificada, task.fecha_fin_planificada, task.estado)} /> : null}
      </div>

      {task ? (
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
          <p className={`font-medium ${tone.heading}`}>{task.operacion || 'Sin operación'}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <span className={tone.mutedText}>Inicio: {formatDateTime(task.fecha_inicio_planificada)}</span>
            <span className={tone.mutedText}>Fin: {formatDateTime(task.fecha_fin_planificada)}</span>
          </div>
          <p className={`text-xs ${tone.mutedText}`}>Técnico: {task.tecnico || 'Sin técnico'}</p>
        </div>
      ) : null}
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

function workshopCardTone(signal: 'a-tiempo' | 'por-vencer' | 'atrasado' | 'proximo') {
  const tones = {
    atrasado: {
      card: 'border-red-300 bg-red-50 shadow-red-100',
      bar: 'bg-red-600',
      panel: 'border-red-200 bg-white/85',
      nextPanel: 'border-red-200 bg-red-100/70',
      statusPill: 'bg-red-600 text-white',
      heading: 'text-red-950',
      bodyText: 'text-red-800',
      mutedText: 'text-red-700',
    },
    'por-vencer': {
      card: 'border-yellow-300 bg-yellow-50 shadow-yellow-100',
      bar: 'bg-yellow-500',
      panel: 'border-yellow-200 bg-white/85',
      nextPanel: 'border-yellow-200 bg-yellow-100/70',
      statusPill: 'bg-yellow-500 text-yellow-950',
      heading: 'text-yellow-950',
      bodyText: 'text-yellow-800',
      mutedText: 'text-yellow-700',
    },
    'a-tiempo': {
      card: 'border-green-300 bg-green-50 shadow-green-100',
      bar: 'bg-green-600',
      panel: 'border-green-200 bg-white/85',
      nextPanel: 'border-green-200 bg-green-100/70',
      statusPill: 'bg-green-600 text-white',
      heading: 'text-green-950',
      bodyText: 'text-green-800',
      mutedText: 'text-green-700',
    },
    proximo: {
      card: 'border-blue-300 bg-blue-50 shadow-blue-100',
      bar: 'bg-blue-600',
      panel: 'border-blue-200 bg-white/85',
      nextPanel: 'border-blue-200 bg-blue-100/70',
      statusPill: 'bg-blue-600 text-white',
      heading: 'text-blue-950',
      bodyText: 'text-blue-800',
      mutedText: 'text-blue-700',
    },
  };

  return tones[signal];
}
