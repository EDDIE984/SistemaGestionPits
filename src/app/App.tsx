import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from '@/app/auth/AuthContext';
import { PrivateRoute } from '@/app/auth/PrivateRoute';
import { Layout } from '@/app/components/Layout';
import { Toaster } from '@/app/components/ui/sonner';
import { CatalogMaintenancePage } from '@/app/pages/CatalogMaintenancePage';
import { ConfigurationPage } from '@/app/pages/ConfigurationPage';
import { Dashboard } from '@/app/pages/Dashboard';
import { GanttPage } from '@/app/pages/GanttPage';
import { IslandBoardPage } from '@/app/pages/IslandBoardPage';
import { Login } from '@/app/pages/Login';
import { ModificationsPage } from '@/app/pages/ModificationsPage';
import { NewOrderPage } from '@/app/pages/NewOrderPage';
import { NotificationsPage } from '@/app/pages/NotificationsPage';
import { OrderDetailPage } from '@/app/pages/OrderDetailPage';
import { OrdersPage } from '@/app/pages/OrdersPage';
import { PlaceholderPage } from '@/app/pages/PlaceholderPage';
import { ReportsPage } from '@/app/pages/ReportsPage';
import { WorkshopScreenPage } from '@/app/pages/WorkshopScreenPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="ordenes" element={<OrdersPage />} />
              <Route path="ordenes/nueva" element={<NewOrderPage />} />
              <Route path="ordenes/:id" element={<OrderDetailPage />} />
              <Route path="ordenes/:id/proforma" element={<PlaceholderPage title="Levantamiento de proforma" description="Registro de piezas y categorias K1-K5 por orden." />} />
              <Route path="ordenes/:id/aseguradora" element={<PlaceholderPage title="Gestion de aseguradora" description="Seguimiento opcional de envio, revision, aprobacion y observaciones." />} />
              <Route path="ordenes/:id/repuestos" element={<PlaceholderPage title="Compra de repuestos" description="Control de repuestos requeridos, proveedores, costos y fechas de llegada." />} />
              <Route path="ordenes/:id/planificacion" element={<PlaceholderPage title="Planificacion de reparacion" description="Asignacion de operaciones flat rate por isla, tecnico, tarifa y fecha." />} />
              <Route path="ordenes/:id/calidad" element={<PlaceholderPage title="Control de calidad" description="Checklist configurable, observaciones y aprobacion final." />} />
              <Route path="ordenes/:id/entrega" element={<PlaceholderPage title="Entrega del vehiculo" description="Notificacion al cliente, entrega real y cierre de la orden." />} />
              <Route path="islas" element={<IslandBoardPage />} />
              <Route path="islas/:islaId" element={<IslandBoardPage />} />
              <Route path="modificaciones" element={<ModificationsPage />} />
              <Route path="pantalla-taller" element={<WorkshopScreenPage />} />
              <Route path="gantt" element={<GanttPage />} />
              <Route path="reportes" element={<ReportsPage />} />
              <Route path="reportes/:tipo" element={<ReportsPage />} />
              <Route path="configuracion" element={<ConfigurationPage />} />
              <Route path="configuracion/:catalogo" element={<CatalogMaintenancePage />} />
              <Route path="notificaciones" element={<NotificationsPage />} />
            </Route>
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </AuthProvider>
  );
}
