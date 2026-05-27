import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { matchesSucursalScope, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { formatDateTime } from '@/app/lib/format';
import { useMockOrderProcesses, useMockOrders } from '@/app/store/mockOrders';

const tracks = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
const islands = ['Enderezada', 'Pintura', 'Mecanica', 'Calidad'];
const dayStartHour = 8;
const dayEndHour = 18;
type GanttView = 'diaria' | 'semanal';

export function GanttPage() {
  const orders = useMockOrders();
  const processes = useMockOrderProcesses();
  const sucursalScope = useSucursalScope();
  const scopedOrders = orders.filter((order) => matchesSucursalScope(order.sucursal_id, sucursalScope.effectiveSucursalId));
  const allTasks = scopedOrders
    .filter((order) => order.estado !== 'ENTREGADO')
    .flatMap((order) => {
      const process = processes[order.id];
      return (process?.tareas ?? []).map((task, index) => ({
        ...task,
        taskIndex: index,
        orden_id: order.id,
        numero_orden: order.numero_orden,
        placa: order.placa,
        sucursal_id: order.sucursal_id,
      }));
    });
  const [selectedDate, setSelectedDate] = useState(() => initialGanttDate(allTasks));
  const [view, setView] = useState<GanttView>('diaria');
  const tasks = useMemo(
    () => allTasks.filter((task) => (
      view === 'diaria'
        ? taskMatchesDate(task.fecha_inicio_planificada, task.fecha_fin_planificada, selectedDate)
        : taskMatchesWeek(task.fecha_inicio_planificada, task.fecha_fin_planificada, selectedDate)
    )),
    [allTasks, selectedDate, view]
  );
  const displayDate = new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dateFromInput(selectedDate));
  const weekRange = weekRangeLabel(selectedDate);
  const title = view === 'diaria'
    ? `Vista diaria · ${displayDate}`
    : `Vista semanal · ${weekRange}`;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={CalendarDays}
        title="Gantt de taller"
        description="Cronograma diario por isla con barras de planificacion, atraso y proximos trabajos."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <CardTitle>{title}</CardTitle>
              <p className="mt-1 text-sm text-gray-600">{tasks.length} tarea(s) planificada(s) para la vista seleccionada.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64">
                <SucursalScopeControl
                  isAdmin={sucursalScope.isAdmin}
                  sucursales={sucursalScope.sucursales}
                  selectedSucursalId={sucursalScope.selectedSucursalId}
                  selectedSucursalName={sucursalScope.selectedSucursalName}
                  onSucursalChange={sucursalScope.setSelectedSucursalId}
                />
              </div>
              <Tabs value={view} onValueChange={(value) => setView(value as GanttView)}>
                <TabsList>
                  <TabsTrigger value="diaria">Diaria</TabsTrigger>
                  <TabsTrigger value="semanal">Semanal</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="min-w-52 space-y-2">
                <Label htmlFor="gantt-date">{view === 'diaria' ? 'Fecha' : 'Semana de'}</Label>
                <Input id="gantt-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {allTasks.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-600">
              Aun no hay tareas planificadas. Planifica operaciones por isla desde el detalle de una orden.
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-600">
              No hay tareas planificadas para {view === 'diaria' ? displayDate : weekRange}. Cambia la fecha para revisar otro periodo.
            </div>
          ) : view === 'semanal' ? (
            <WeeklyGantt tasks={tasks} selectedDate={selectedDate} />
          ) : (
            <DailyGantt tasks={tasks} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type GanttTask = {
  taskIndex: number;
  orden_id: string;
  numero_orden: string;
  placa: string;
  isla: string;
  estado?: string;
  fecha_inicio_planificada?: string;
  fecha_fin_planificada?: string;
};

function DailyGantt({ tasks }: { tasks: GanttTask[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[160px_repeat(6,1fr)] border-b border-gray-200 text-xs uppercase text-gray-500">
          <div className="py-3">Isla</div>
          {tracks.map((track) => <div key={track} className="py-3 text-center">{track}</div>)}
        </div>

        <div className="divide-y divide-gray-200">
          {islands.map((isla) => {
            const rowTasks = tasks.filter((task) => task.isla === isla);
            return (
              <div key={isla} className="grid grid-cols-[160px_1fr] items-center py-5">
                <div>
                  <p className="font-medium text-gray-900">{isla}</p>
                  <p className="text-xs text-gray-500">{rowTasks.length} tarea(s)</p>
                </div>
                <div className="relative min-h-20 rounded-lg bg-gray-50">
                  <div className="absolute inset-x-0 top-1/2 grid -translate-y-1/2 grid-cols-6">
                    {tracks.map((track) => <span key={track} className="h-14 border-l border-gray-200" />)}
                  </div>
                  {rowTasks.map((task, index) => {
                    const signal = signalForTask(task.fecha_inicio_planificada, task.fecha_fin_planificada, task.estado);
                    const position = ganttPosition(task.fecha_inicio_planificada, task.fecha_fin_planificada);
                    return <GanttBar key={`${task.orden_id}-${task.taskIndex}`} task={task} signal={signal} top={12 + index * 46} left={position.left} width={position.width} />;
                  })}
                  <div style={{ height: `${Math.max(80, rowTasks.length * 46 + 18)}px` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WeeklyGantt({ tasks, selectedDate }: { tasks: GanttTask[]; selectedDate: string }) {
  const days = weekDays(selectedDate);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[1040px]">
        <div className="grid grid-cols-[160px_repeat(7,1fr)] border-b border-gray-200 text-xs uppercase text-gray-500">
          <div className="py-3">Isla</div>
          {days.map((day) => (
            <div key={day.toISOString()} className="py-3 text-center">
              {new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(day)}
            </div>
          ))}
        </div>

        <div className="divide-y divide-gray-200">
          {islands.map((isla) => {
            const rowTasks = tasks.filter((task) => task.isla === isla);
            return (
              <div key={isla} className="grid grid-cols-[160px_1fr] items-center py-5">
                <div>
                  <p className="font-medium text-gray-900">{isla}</p>
                  <p className="text-xs text-gray-500">{rowTasks.length} tarea(s)</p>
                </div>
                <div className="relative min-h-20 rounded-lg bg-gray-50">
                  <div className="absolute inset-x-0 top-1/2 grid -translate-y-1/2 grid-cols-7">
                    {days.map((day) => <span key={day.toISOString()} className="h-14 border-l border-gray-200" />)}
                  </div>
                  {rowTasks.map((task, index) => {
                    const signal = signalForTask(task.fecha_inicio_planificada, task.fecha_fin_planificada, task.estado);
                    const position = weeklyPosition(task.fecha_inicio_planificada, task.fecha_fin_planificada, selectedDate);
                    return <GanttBar key={`${task.orden_id}-${task.taskIndex}`} task={task} signal={signal} top={12 + index * 46} left={position.left} width={position.width} />;
                  })}
                  <div style={{ height: `${Math.max(80, rowTasks.length * 46 + 18)}px` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GanttBar({
  task,
  signal,
  top,
  left,
  width,
}: {
  task: GanttTask;
  signal: 'a-tiempo' | 'por-vencer' | 'atrasado' | 'proximo';
  top: number;
  left: number;
  width: number;
}) {
  return (
    <div
      className={`absolute h-10 rounded-md border px-3 py-2 text-xs font-medium shadow-sm ${signalClasses(signal)}`}
      style={{ left: `${left}%`, width: `${width}%`, top: `${top}px` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span>{task.numero_orden} · {task.placa}</span>
        <StatusBadge signal={signal} />
      </div>
      <span className="sr-only">
        {formatDateTime(task.fecha_inicio_planificada)} - {formatDateTime(task.fecha_fin_planificada)}
      </span>
    </div>
  );
}

function ganttPosition(start?: string, end?: string) {
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const totalMinutes = (dayEndHour - dayStartHour) * 60;
  const startMinutes = startDate
    ? (startDate.getHours() - dayStartHour) * 60 + startDate.getMinutes()
    : 0;
  const endMinutes = endDate
    ? (endDate.getHours() - dayStartHour) * 60 + endDate.getMinutes()
    : startMinutes + 60;
  const left = Math.max(0, Math.min(95, (startMinutes / totalMinutes) * 100));
  const width = Math.max(8, Math.min(100 - left, ((endMinutes - startMinutes) / totalMinutes) * 100));

  return { left, width };
}

function initialGanttDate(tasks: Array<{ fecha_inicio_planificada?: string; fecha_fin_planificada?: string }>) {
  const firstTask = tasks.find((task) => task.fecha_inicio_planificada || task.fecha_fin_planificada);
  const date = firstTask?.fecha_inicio_planificada || firstTask?.fecha_fin_planificada;
  return date ? inputDateValue(new Date(date)) : inputDateValue(new Date());
}

function inputDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromInput(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function taskMatchesDate(start: string | undefined, end: string | undefined, selectedDate: string) {
  if (!start && !end) return false;
  const selected = dateFromInput(selectedDate);
  const dayStart = new Date(selected);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selected);
  dayEnd.setHours(23, 59, 59, 999);
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : startDate;

  if (!startDate && !endDate) return false;
  return (startDate?.getTime() ?? 0) <= dayEnd.getTime()
    && (endDate?.getTime() ?? startDate?.getTime() ?? 0) >= dayStart.getTime();
}

function taskMatchesWeek(start: string | undefined, end: string | undefined, selectedDate: string) {
  if (!start && !end) return false;
  const startOfWeek = weekStart(dateFromInput(selectedDate));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : startDate;

  if (!startDate && !endDate) return false;
  return (startDate?.getTime() ?? 0) <= endOfWeek.getTime()
    && (endDate?.getTime() ?? startDate?.getTime() ?? 0) >= startOfWeek.getTime();
}

function weekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function weekDays(selectedDate: string) {
  const start = weekStart(dateFromInput(selectedDate));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function weekRangeLabel(selectedDate: string) {
  const days = weekDays(selectedDate);
  const formatter = new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' });
  return `${formatter.format(days[0])} - ${formatter.format(days[6])}`;
}

function weeklyPosition(start: string | undefined, end: string | undefined, selectedDate: string) {
  const week = weekStart(dateFromInput(selectedDate));
  const weekEnd = new Date(week);
  weekEnd.setDate(week.getDate() + 7);
  const startDate = start ? new Date(start) : week;
  const endDate = end ? new Date(end) : startDate;
  const totalMs = weekEnd.getTime() - week.getTime();
  const clippedStart = Math.max(startDate.getTime(), week.getTime());
  const clippedEnd = Math.min(Math.max(endDate.getTime(), clippedStart + 60 * 60 * 1000), weekEnd.getTime());
  const left = Math.max(0, Math.min(95, ((clippedStart - week.getTime()) / totalMs) * 100));
  const width = Math.max(5, Math.min(100 - left, ((clippedEnd - clippedStart) / totalMs) * 100));

  return { left, width };
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

function signalClasses(signal: 'a-tiempo' | 'por-vencer' | 'atrasado' | 'proximo') {
  if (signal === 'atrasado') return 'border-red-200 bg-red-50 text-red-800';
  if (signal === 'por-vencer') return 'border-yellow-200 bg-yellow-50 text-yellow-800';
  if (signal === 'proximo') return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-green-200 bg-green-50 text-green-800';
}
