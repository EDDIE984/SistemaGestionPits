import { BarChart3, ClipboardList, Clock, DollarSign, Download, History, UserCheck, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/app/components/PageHeader';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { matchesSucursalScope, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { formatDateTime, formatMoney, orderStatusLabel } from '@/app/lib/format';
import { useMockOrderProcesses, useMockOrders } from '@/app/store/mockOrders';
import type { OrderStatus } from '@/app/types';

export function ReportsPage() {
  const orders = useMockOrders();
  const processes = useMockOrderProcesses();
  const sucursalScope = useSucursalScope();
  const scopedOrders = orders.filter((order) => matchesSucursalScope(order.sucursal_id, sucursalScope.effectiveSucursalId));
  const tasks = scopedOrders.flatMap((order) => {
    const process = processes[order.id];
    return (process?.tareas ?? []).map((task, index) => ({
      ...task,
      taskIndex: index,
      orden_id: order.id,
      numero_orden: order.numero_orden,
      placa: order.placa,
      estado_orden: order.estado,
      sucursal_id: order.sucursal_id,
    }));
  });
  const events = scopedOrders.flatMap((order) => {
    const process = processes[order.id];
    return (process?.historial ?? []).map((event) => ({
      ...event,
      numero_orden: order.numero_orden,
      placa: order.placa,
    }));
  }).sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());
  const ordersByStatus = scopedOrders.reduce<Record<string, number>>((acc, order) => {
    acc[order.estado] = (acc[order.estado] ?? 0) + 1;
    return acc;
  }, {});
  const delayedTasks = tasks.filter((task) => isDelayed(task.fecha_fin_planificada, task.estado));
  const estimatedCost = tasks.reduce((total, task) => total + Number(task.tiempo_estandar_horas || 0) * Number(task.tarifa_hora || 0), 0);
  const completedTasks = tasks.filter((task) => task.estado === 'COMPLETADA');
  const productivity = productivityByTechnician(tasks);
  const islandPerformance = performanceByIsland(tasks);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={BarChart3}
        title="Reportes"
        description="Reportes calculados desde el mock actual de ordenes, tareas, costos e historial."
        action={<Button variant="outline"><Download className="h-4 w-4" />Exportar</Button>}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Ordenes" value={String(scopedOrders.length)} detail="Registradas en mock" icon={ClipboardList} />
        <MetricCard title="Tareas isla" value={String(tasks.length)} detail={`${completedTasks.length} completadas`} icon={Wrench} />
        <MetricCard title="Atrasos" value={String(delayedTasks.length)} detail="Fin planificado vencido" icon={Clock} />
        <MetricCard title="Costo estimado" value={formatMoney(estimatedCost)} detail="Mano de obra planificada" icon={DollarSign} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Horas por isla</CardTitle>
          </CardHeader>
          <CardContent>
            {islandPerformance.length === 0 ? (
              <EmptyText text="No hay tareas con tiempos para graficar." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={islandPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="isla" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}h`} />
                    <Legend />
                    <Bar dataKey="horasPlanificadas" name="Planificadas" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="horasReales" name="Reales" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eficiencia por isla</CardTitle>
          </CardHeader>
          <CardContent>
            {islandPerformance.length === 0 ? (
              <EmptyText text="No hay tiempo real registrado." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={islandPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="isla" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} unit="%" />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(0)}%`} />
                    <ReferenceLine y={100} stroke="#64748b" strokeDasharray="4 4" label="Meta" />
                    <Bar dataKey="eficiencia" name="Eficiencia" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atraso acumulado</CardTitle>
          </CardHeader>
          <CardContent>
            {islandPerformance.length === 0 ? (
              <EmptyText text="No hay atrasos calculables." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={islandPerformance}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="isla" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value) => `${Number(value).toFixed(1)}h`} />
                    <Bar dataKey="horasAtraso" name="Horas atraso" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ordenes por estado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(ordersByStatus).length === 0 ? (
              <EmptyText text="No hay ordenes registradas." />
            ) : (
              Object.entries(ordersByStatus).map(([status, count]) => {
                const percent = scopedOrders.length ? (count / scopedOrders.length) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900">{orderStatusLabel(status as OrderStatus)}</span>
                      <span className="text-gray-600">{count}</span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atrasos por isla</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {delayedTasks.length === 0 ? (
              <EmptyText text="No hay tareas atrasadas." />
            ) : (
              delayedTasks.map((task) => (
                <ReportRow
                  key={`${task.orden_id}-${task.taskIndex}`}
                  title={`${task.isla} · ${task.numero_orden}`}
                  detail={`${task.placa} · Fin: ${formatDateTime(task.fecha_fin_planificada)}`}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productividad por tecnico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {productivity.length === 0 ? (
              <EmptyText text="Aun no hay tareas con tecnico asignado." />
            ) : (
              productivity.map((item) => (
                <ReportRow
                  key={item.tecnico}
                  title={item.tecnico}
                  detail={`${item.tareas} tarea(s) · ${item.horas.toFixed(1)}h estandar · ${formatMoney(item.costo)}`}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <EmptyText text="No hay eventos guardados." />
            ) : (
              events.slice(0, 8).map((event, index) => (
                <ReportRow
                  key={`${event.fecha_hora}-${index}`}
                  title={`${event.numero_orden} · ${event.titulo ?? 'Evento'}`}
                  detail={`${formatDateTime(event.fecha_hora)} · ${event.detalle || event.observacion}`}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Costos de mano de obra</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <EmptyText text="No hay tareas planificadas para calcular costos." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                    <th className="py-3">Orden</th>
                    <th>Isla</th>
                    <th>Tecnico</th>
                    <th>Horas</th>
                    <th>Tarifa</th>
                    <th>Costo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tasks.map((task) => {
                    const cost = Number(task.tiempo_estandar_horas || 0) * Number(task.tarifa_hora || 0);
                    return (
                      <tr key={`${task.orden_id}-${task.taskIndex}`}>
                        <td className="py-3 text-sm font-medium text-gray-900">{task.numero_orden}</td>
                        <td className="text-sm text-gray-700">{task.isla}</td>
                        <td className="text-sm text-gray-700">{task.tecnico || 'Sin tecnico'}</td>
                        <td className="text-sm text-gray-700">{task.tiempo_estandar_horas}</td>
                        <td className="text-sm text-gray-700">{formatMoney(Number(task.tarifa_hora || 0))}</td>
                        <td className="text-sm font-medium text-gray-900">{formatMoney(cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-6">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
          <p className="mt-1 text-sm text-gray-600">{detail}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function ReportRow({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-600">{detail}</p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">{text}</p>;
}

function isDelayed(end?: string, status?: string) {
  if (!end || status === 'COMPLETADA') return false;
  return new Date(end).getTime() < Date.now();
}

function productivityByTechnician(tasks: Array<{ tecnico?: string; tiempo_estandar_horas: number; tarifa_hora: number }>) {
  const grouped = tasks.reduce<Record<string, { tecnico: string; tareas: number; horas: number; costo: number }>>((acc, task) => {
    const tecnico = task.tecnico || 'Sin tecnico';
    if (!acc[tecnico]) {
      acc[tecnico] = { tecnico, tareas: 0, horas: 0, costo: 0 };
    }

    acc[tecnico].tareas += 1;
    acc[tecnico].horas += Number(task.tiempo_estandar_horas || 0);
    acc[tecnico].costo += Number(task.tiempo_estandar_horas || 0) * Number(task.tarifa_hora || 0);
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => b.tareas - a.tareas);
}

type ReportTask = {
  isla?: string;
  tiempo_estandar_horas: number;
  tarifa_hora: number;
  fecha_inicio_planificada?: string;
  fecha_fin_planificada?: string;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  estado?: string;
  eventos?: Array<{
    accion: 'INICIAR' | 'PAUSAR' | 'REANUDAR' | 'FINALIZAR';
    fecha_hora: string;
  }>;
};

function performanceByIsland(tasks: ReportTask[]) {
  const grouped = tasks.reduce<Record<string, {
    isla: string;
    tareas: number;
    completadas: number;
    horasPlanificadas: number;
    horasReales: number;
    horasAtraso: number;
  }>>((acc, task) => {
    const isla = task.isla || 'Sin isla';
    if (!acc[isla]) {
      acc[isla] = {
        isla,
        tareas: 0,
        completadas: 0,
        horasPlanificadas: 0,
        horasReales: 0,
        horasAtraso: 0,
      };
    }

    const realHours = taskRealHours(task);
    acc[isla].tareas += 1;
    acc[isla].completadas += task.estado === 'COMPLETADA' ? 1 : 0;
    acc[isla].horasPlanificadas += Number(task.tiempo_estandar_horas || 0);
    acc[isla].horasReales += realHours;
    acc[isla].horasAtraso += taskDelayHours(task);
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      horasPlanificadas: roundOne(item.horasPlanificadas),
      horasReales: roundOne(item.horasReales),
      horasAtraso: roundOne(item.horasAtraso),
      eficiencia: item.horasReales > 0 ? Math.round((item.horasPlanificadas / item.horasReales) * 100) : 0,
    }))
    .sort((a, b) => b.horasAtraso - a.horasAtraso || b.tareas - a.tareas);
}

function taskRealHours(task: ReportTask) {
  const events = (task.eventos ?? [])
    .slice()
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
  let activeStart: number | null = null;
  let activeMs = 0;

  for (const event of events) {
    const time = new Date(event.fecha_hora).getTime();
    if (!Number.isFinite(time)) continue;

    if (event.accion === 'INICIAR' || event.accion === 'REANUDAR') {
      activeStart = time;
    }

    if ((event.accion === 'PAUSAR' || event.accion === 'FINALIZAR') && activeStart !== null) {
      activeMs += Math.max(0, time - activeStart);
      activeStart = null;
    }
  }

  if (activeStart !== null && task.estado === 'EN_PROCESO') {
    activeMs += Math.max(0, Date.now() - activeStart);
  }

  if (activeMs === 0 && task.fecha_inicio_real && task.fecha_fin_real) {
    activeMs = Math.max(0, new Date(task.fecha_fin_real).getTime() - new Date(task.fecha_inicio_real).getTime());
  }

  return activeMs / 3600000;
}

function taskDelayHours(task: ReportTask) {
  if (!task.fecha_fin_planificada) return 0;
  const plannedEnd = new Date(task.fecha_fin_planificada).getTime();
  if (!Number.isFinite(plannedEnd)) return 0;
  const actualEnd = task.fecha_fin_real
    ? new Date(task.fecha_fin_real).getTime()
    : task.estado === 'COMPLETADA'
      ? plannedEnd
      : Date.now();

  return Math.max(0, (actualEnd - plannedEnd) / 3600000);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
