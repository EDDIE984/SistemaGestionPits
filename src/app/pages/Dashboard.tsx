import { AlertTriangle, Car, CheckCircle2, Clock, DollarSign, ExternalLink, Gauge, Wrench } from 'lucide-react';
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
