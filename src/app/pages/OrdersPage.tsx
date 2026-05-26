import { useState } from 'react';
import { Link } from 'react-router';
import { ClipboardList, Plus, Search } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Progress } from '@/app/components/ui/progress';
import { formatDateTime } from '@/app/lib/format';
import { useMockOrders } from '@/app/store/mockOrders';

export function OrdersPage() {
  const orders = useMockOrders();
  const [search, setSearch] = useState('');

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
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Buscar por orden, placa o cliente"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Input placeholder="Sucursal" />
            <Input placeholder="Estado" />
          </div>

          {orders.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Cargando ordenes...</p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                  <th className="py-3">Orden</th>
                  <th>Vehiculo</th>
                  <th>Cliente</th>
                  <th>Sucursal</th>
                  <th>Ingreso</th>
                  <th>Estado</th>
                  <th>Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.filter((o) => {
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return (
                    o.numero_orden.toLowerCase().includes(q) ||
                    o.placa.toLowerCase().includes(q) ||
                    o.cliente.toLowerCase().includes(q)
                  );
                }).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-4">
                      <Link to={`/ordenes/${order.id}`} className="font-medium text-blue-600 hover:underline">
                        {order.numero_orden}
                      </Link>
                    </td>
                    <td className="text-sm text-gray-700">{order.placa} · {order.marca} {order.modelo}</td>
                    <td className="text-sm text-gray-700">{order.cliente}</td>
                    <td className="text-sm text-gray-700">{order.sucursal}</td>
                    <td className="text-sm text-gray-600">{formatDateTime(order.fecha_ingreso)}</td>
                    <td><StatusBadge status={order.estado} /></td>
                    <td className="min-w-40">
                      <div className="flex items-center gap-2">
                        <Progress value={order.progreso} className="h-2" />
                        <span className="text-xs text-gray-500">{order.progreso}%</span>
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
