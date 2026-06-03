import { Activity, AlertTriangle, Car, CheckCircle2, Clock, DollarSign, ExternalLink, Gauge, UserCheck, Wrench } from 'lucide-react';
import { Link } from 'react-router';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { KpiCard } from '@/app/components/KpiCard';
import { PageHeader } from '@/app/components/PageHeader';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { matchesSucursalScope, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { formatDateTime, formatMoney, orderStatusLabel } from '@/app/lib/format';
import { useMockOrders, useMockOrderProcesses } from '@/app/store/mockOrders';

export function Dashboard() {
  const orders = useMockOrders();
  const processes = useMockOrderProcesses();
  const sucursalScope = useSucursalScope();
  const scopedOrders = orders.filter((order) => matchesSucursalScope(order.sucursal_id, sucursalScope.effectiveSucursalId));
  const scopedOrderIds = new Set(scopedOrders.map((order) => order.id));
  const activeOrders = scopedOrders.filter((order) => order.estado !== 'ENTREGADO');
  const allTasks = Object.entries(processes)
    .filter(([orderId]) => scopedOrderIds.has(orderId))
    .flatMap(([, process]) => process.tareas ?? []);
  const now = Date.now();
  const delayedTasks = allTasks.filter((task) => {
    if (!task.fecha_fin_planificada || task.estado === 'COMPLETADA') return false;
    return new Date(task.fecha_fin_planificada).getTime() < now;
  });
  const estimatedCost = allTasks.reduce(
    (total, task) => total + task.tiempo_estandar_horas * task.tarifa_hora,
    0
  );
  const technicianPerformance = performanceByTechnician(allTasks);
  const trackedTasks = allTasks.filter((task) => (task.eventos?.length ?? 0) > 0 || task.fecha_inicio_real);
  const totalRealHours = allTasks.reduce((total, task) => total + taskRealHours(task), 0);
  const totalPausedHours = allTasks.reduce((total, task) => total + taskPausedHours(task), 0);
  const averageEfficiency = technicianPerformance.length === 0
    ? 0
    : Math.round(technicianPerformance.reduce((total, item) => total + item.eficiencia, 0) / technicianPerformance.length);
  const topTechnicians = technicianPerformance.slice(0, 5);

  const cumplimiento = allTasks.length === 0
    ? 0
    : Math.round(((allTasks.length - delayedTasks.length) / allTasks.length) * 100);

  const chartData = Object.values(
    allTasks.reduce<Record<string, { isla: string; horas: number; atraso: number }>>((acc, task) => {
      const key = task.isla || 'Sin isla';
      if (!acc[key]) acc[key] = { isla: key, horas: 0, atraso: 0 };
      acc[key].horas += task.tiempo_estandar_horas;
      if (task.fecha_fin_planificada && task.estado !== 'COMPLETADA' &&
          new Date(task.fecha_fin_planificada).getTime() < now) {
        acc[key].atraso += 1;
      }
      return acc;
    }, {})
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={Gauge}
        title="Dashboard de taller"
        description="Vista ejecutiva de ordenes, carga por isla, atrasos y eficiencia inicial del proceso operativo."
        action={(
          <div className="w-full min-w-64 lg:w-72">
            <SucursalScopeControl
              isAdmin={sucursalScope.isAdmin}
              sucursales={sucursalScope.sucursales}
              selectedSucursalId={sucursalScope.selectedSucursalId}
              selectedSucursalName={sucursalScope.selectedSucursalName}
              onSucursalChange={sucursalScope.setSelectedSucursalId}
            />
          </div>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Ordenes activas" value={String(activeOrders.length)} detail="En flujo operativo" icon={Car} tone="blue" />
        <KpiCard title="Tareas atrasadas" value={String(delayedTasks.length)} detail="Requieren revision" icon={AlertTriangle} tone="red" />
        <KpiCard title="Cumplimiento" value={`${cumplimiento}%`} detail="Planificacion vs avance" icon={CheckCircle2} tone="green" />
        <KpiCard title="Costo estimado" value={formatMoney(estimatedCost)} detail="Mano de obra planificada" icon={DollarSign} tone="orange" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard title="Tecnicos activos" value={String(technicianPerformance.length)} detail="Con tareas asignadas" icon={UserCheck} tone="blue" />
        <KpiCard title="Horas reales" value={`${roundOne(totalRealHours)}h`} detail={`${trackedTasks.length} tarea(s) con registro`} icon={Activity} tone="green" />
        <KpiCard title="Eficiencia promedio" value={`${averageEfficiency}%`} detail={`${roundOne(totalPausedHours)}h pausadas`} icon={Clock} tone="orange" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Carga por isla
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={310}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="isla" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="horas" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="atraso" fill="#d4183d" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-blue-600" />
              Islas ahora
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allTasks.length === 0 ? (
              <p className="text-sm text-gray-500">Sin tareas activas.</p>
            ) : null}
            {allTasks.slice(0, 4).map((task, index) => {
              const isDelayed = task.fecha_fin_planificada && task.estado !== 'COMPLETADA'
                && new Date(task.fecha_fin_planificada).getTime() < Date.now();
              return (
                <div key={task.id ?? index} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{task.isla}</p>
                      <p className="text-sm text-gray-600">{task.operacion}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isDelayed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {isDelayed ? 'Atrasado' : 'A tiempo'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    Fin planificado: {formatDateTime(task.fecha_fin_planificada)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Desempeno por tecnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topTechnicians.length === 0 ? (
              <p className="text-sm text-gray-500">Sin tecnicos asignados.</p>
            ) : (
              <ResponsiveContainer width="100%" height={310}>
                <BarChart data={topTechnicians}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tecnico" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="horasPlanificadas" name="Planificadas" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="horasReales" name="Reales" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Tecnicos destacados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topTechnicians.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos de desempeno.</p>
            ) : (
              topTechnicians.map((item) => (
                <div key={item.tecnico} className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{item.tecnico}</p>
                      <p className="mt-1 text-sm text-gray-600">{item.tareas} tarea(s) · {item.completadas} completada(s)</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.eficiencia >= 100 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.eficiencia}%
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-500">
                    Real: {item.horasReales.toFixed(1)}h · Pausa: {item.horasPausadas.toFixed(1)}h · Atraso: {item.horasAtraso.toFixed(1)}h
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ordenes recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="py-3">Orden</th>
                  <th>Vehiculo</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Avance</th>
                  <th className="text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {scopedOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-4 text-sm font-medium text-gray-900">{order.numero_orden}</td>
                    <td className="text-sm text-gray-700">{order.placa} · {order.marca} {order.modelo}</td>
                    <td className="text-sm text-gray-700">{order.cliente}</td>
                    <td><StatusBadge status={order.estado} /></td>
                    <td className="min-w-44">
                      <div className="flex items-center gap-3">
                        <Progress value={order.progreso} className="h-2" />
                        <span className="w-10 text-xs text-gray-500">{order.progreso}%</span>
                      </div>
                      <span className="sr-only">{orderStatusLabel(order.estado)}</span>
                    </td>
                    <td className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/ordenes/${order.id}`}>
                          <ExternalLink className="h-4 w-4" />
                          Ir a orden
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type DashboardTask = {
  tecnico?: string;
  tiempo_estandar_horas: number;
  fecha_fin_planificada?: string;
  fecha_inicio_real?: string;
  fecha_fin_real?: string;
  estado?: string;
  eventos?: Array<{ accion: 'INICIAR' | 'PAUSAR' | 'REANUDAR' | 'FINALIZAR'; fecha_hora: string }>;
};

function performanceByTechnician(tasks: DashboardTask[]) {
  const grouped = tasks.reduce<Record<string, {
    tecnico: string;
    tareas: number;
    completadas: number;
    horasPlanificadas: number;
    horasReales: number;
    horasPausadas: number;
    horasAtraso: number;
  }>>((acc, task) => {
    const tecnico = task.tecnico || 'Sin tecnico';
    if (!acc[tecnico]) {
      acc[tecnico] = {
        tecnico,
        tareas: 0,
        completadas: 0,
        horasPlanificadas: 0,
        horasReales: 0,
        horasPausadas: 0,
        horasAtraso: 0,
      };
    }

    acc[tecnico].tareas += 1;
    acc[tecnico].completadas += task.estado === 'COMPLETADA' ? 1 : 0;
    acc[tecnico].horasPlanificadas += Number(task.tiempo_estandar_horas || 0);
    acc[tecnico].horasReales += taskRealHours(task);
    acc[tecnico].horasPausadas += taskPausedHours(task);
    acc[tecnico].horasAtraso += taskDelayHours(task);
    return acc;
  }, {});

  return Object.values(grouped)
    .map((item) => ({
      ...item,
      horasPlanificadas: roundOne(item.horasPlanificadas),
      horasReales: roundOne(item.horasReales),
      horasPausadas: roundOne(item.horasPausadas),
      horasAtraso: roundOne(item.horasAtraso),
      eficiencia: item.horasReales > 0 ? Math.round((item.horasPlanificadas / item.horasReales) * 100) : 0,
    }))
    .sort((a, b) => b.eficiencia - a.eficiencia || b.completadas - a.completadas);
}

function taskRealHours(task: DashboardTask) {
  const timing = taskTiming(task);
  if (timing.activeMs > 0) return timing.activeMs / 3600000;
  if (task.fecha_inicio_real && task.fecha_fin_real) {
    return Math.max(0, new Date(task.fecha_fin_real).getTime() - new Date(task.fecha_inicio_real).getTime()) / 3600000;
  }
  return 0;
}

function taskPausedHours(task: DashboardTask) {
  return taskTiming(task).pausedMs / 3600000;
}

function taskTiming(task: DashboardTask) {
  const events = (task.eventos ?? [])
    .slice()
    .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
  let activeStart: number | null = null;
  let pauseStart: number | null = null;
  let activeMs = 0;
  let pausedMs = 0;

  for (const event of events) {
    const time = new Date(event.fecha_hora).getTime();
    if (!Number.isFinite(time)) continue;

    if (event.accion === 'INICIAR' || event.accion === 'REANUDAR') {
      if (pauseStart !== null) {
        pausedMs += Math.max(0, time - pauseStart);
        pauseStart = null;
      }
      activeStart = time;
    }

    if (event.accion === 'PAUSAR') {
      if (activeStart !== null) {
        activeMs += Math.max(0, time - activeStart);
        activeStart = null;
      }
      pauseStart = time;
    }

    if (event.accion === 'FINALIZAR') {
      if (activeStart !== null) {
        activeMs += Math.max(0, time - activeStart);
        activeStart = null;
      }
      if (pauseStart !== null) {
        pausedMs += Math.max(0, time - pauseStart);
        pauseStart = null;
      }
    }
  }

  if (activeStart !== null && task.estado === 'EN_PROCESO') activeMs += Math.max(0, Date.now() - activeStart);
  if (pauseStart !== null && task.estado === 'PAUSADA') pausedMs += Math.max(0, Date.now() - pauseStart);

  return { activeMs, pausedMs };
}

function taskDelayHours(task: DashboardTask) {
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
