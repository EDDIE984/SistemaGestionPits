import { Link, Navigate, Outlet, useLocation } from 'react-router';
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardList,
  Gauge,
  LogOut,
  Menu,
  Monitor,
  PlusCircle,
  Settings,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/app/auth/AuthContext';
import { Button } from '@/app/components/ui/button';

export function Layout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isOperario = user?.rol === 'OPERARIO';
  const operarioAllowedPaths = ['/pantalla-taller', '/islas'];

  if (isOperario && !operarioAllowedPaths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))) {
    return <Navigate to="/pantalla-taller" replace />;
  }

  const allMenuItems = [
    { path: '/', label: 'Dashboard', icon: Gauge },
    { path: '/ordenes', label: 'Ordenes', icon: ClipboardList },
    { path: '/ordenes/nueva', label: 'Nueva orden', icon: PlusCircle },
    { path: '/islas', label: 'Operacion por isla', icon: Wrench },
    { path: '/modificaciones', label: 'Modificaciones', icon: SlidersHorizontal },
    { path: '/pantalla-taller', label: 'Pantalla taller', icon: Monitor },
    { path: '/gantt', label: 'Gantt', icon: CalendarDays },
    { path: '/reportes', label: 'Reportes', icon: BarChart3 },
    { path: '/notificaciones', label: 'Notificaciones', icon: Bell },
    { path: '/configuracion', label: 'Configuracion', icon: Settings, roles: ['ADMINISTRADOR'] },
  ];

  const menuItems = allMenuItems.filter(
    (item) => (
      isOperario
        ? operarioAllowedPaths.includes(item.path)
        : (!item.roles || (user?.rol && item.roles.includes(user.rol)))
    )
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
      >
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4">
          <div className={`${!isSidebarOpen && 'hidden'}`}>
            <h1 className="font-semibold text-xl text-gray-800">Gestion PITS</h1>
            <p className="text-xs text-gray-500">OneWayEc</p>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
            aria-label="Alternar menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className={`${!isSidebarOpen && 'hidden'}`}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className={`mb-3 rounded-lg bg-gray-50 p-3 ${!isSidebarOpen && 'hidden'}`}>
            <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
            <p className="text-xs text-gray-500">{user?.rol} · {user?.sucursal_nombre}</p>
          </div>
          <Button variant="ghost" className="w-full justify-start text-gray-700" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span className={`${!isSidebarOpen && 'hidden'}`}>Salir</span>
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
