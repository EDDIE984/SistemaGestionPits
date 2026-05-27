import { useState } from 'react';
import { Link } from 'react-router';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Progress } from '@/app/components/ui/progress';
import { matchesSucursalScope, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { formatDateTime } from '@/app/lib/format';
import { useMockOrders } from '@/app/store/mockOrders';

export function OrdersPage() {
  const orders = useMockOrders();
  const sucursalScope = useSucursalScope();
  const [search, setSearch] = useState('');
  const filteredOrders = orders.filter((order) => matchesSucursalScope(order.sucursal_id, sucursalScope.effectiveSucursalId));

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={ClipboardList}
        title="Ordenes de ingreso"
        description="Consulta el estado actual de cada orden y continua el flujo de taller desde recepcion hasta entrega."
        action={(
          <Button asChild>
            <Link to="/ordenes/nueva">
              <Plus className="h-4 w-4" />
              Nueva orden
            </Link>
          </Button>
        )}
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_260px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por orden, placa o cliente"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <SucursalScopeControl
              isAdmin={sucursalScope.isAdmin}
              sucursales={sucursalScope.sucursales}
              selectedSucursalId={sucursalScope.selectedSucursalId}
              selectedSucursalName={sucursalScope.selectedSucursalName}
              onSucursalChange={sucursalScope.setSelectedSucursalId}
            />
            <Input placeholder="Estado" />
          </div>

          {filteredOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Cargando ordenes...</p>
          ) : null}

          <div className="overflow-x-scroll rounded-md border border-gray-100 [scrollbar-gutter:stable]">
            <table className="min-w-[1180px] table-fixed bg-white">
              <colgroup>
                <col className="w-[120px]" />
                <col className="w-[300px]" />
                <col className="w-[220px]" />
                <col className="w-[170px]" />
                <col className="w-[150px]" />
                <col className="w-[120px]" />
                <col className="w-[160px]" />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Vehiculo</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Sucursal ingreso</th>
                  <th className="px-4 py-3">Fecha ingreso</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.filter((o) => {
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return (
                    o.numero_orden.toLowerCase().includes(q) ||
                    o.placa.toLowerCase().includes(q) ||
                    o.cliente.toLowerCase().includes(q)
                  );
                }).map((order) => (
                  <tr key={order.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link to={`/ordenes/${order.id}`} className="font-medium text-blue-600 hover:underline">
                        {order.numero_orden}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700">
                      <span className="font-medium text-gray-900">{order.placa}</span>
                      <span className="mx-1 text-gray-400">·</span>
                      <span>{order.marca} {order.modelo}</span>
                    </td>
                    <td className="px-4 py-4 text-sm leading-5 text-gray-700">{order.cliente}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{order.sucursal}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">{formatDateTime(order.fecha_ingreso)}</td>
                    <td className="whitespace-nowrap px-4 py-4"><StatusBadge status={order.estado} /></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Progress value={order.progreso} className="h-2" />
                        <span className="w-8 text-right text-xs text-gray-500">{order.progreso}%</span>
                      </div>
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
