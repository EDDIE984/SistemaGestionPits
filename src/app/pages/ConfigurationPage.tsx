import { Link } from 'react-router';
import { Building2, Clock3, Factory, ListChecks, ShieldCheck, SlidersHorizontal, Users, Wrench } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';

const items = [
  { path: '/configuracion/companias', label: 'Companias', description: 'Datos legales y principales de la empresa.', icon: Building2 },
  { path: '/configuracion/sucursales', label: 'Sucursales', description: 'Talleres fisicos, ciudades y contactos.', icon: Factory },
  { path: '/configuracion/aseguradoras', label: 'Aseguradoras', description: 'Companias aseguradoras y contactos.', icon: ShieldCheck },
  { path: '/configuracion/islas', label: 'Islas', description: 'Areas de trabajo por sucursal.', icon: Wrench },
  { path: '/configuracion/usuarios', label: 'Usuarios', description: 'Accesos, roles y sucursal asignada.', icon: Users },
  { path: '/configuracion/tarifas', label: 'Tarifas', description: 'Hora hombre por sucursal, isla o tecnico.', icon: Clock3 },
  { path: '/configuracion/catalogo-operaciones', label: 'Catalogo de operaciones', description: 'Flat rate y tiempos estandar.', icon: ListChecks },
];

export function ConfigurationPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={SlidersHorizontal}
        title="Configuracion"
        description="Catalogos y parametros estructurales del sistema. Esta seccion queda reservada para administradores."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="group rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-blue-400 hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-blue-50 p-3 text-blue-600 transition-colors group-hover:bg-blue-100">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg text-gray-900 transition-colors group-hover:text-blue-600">{item.label}</h2>
                  <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
