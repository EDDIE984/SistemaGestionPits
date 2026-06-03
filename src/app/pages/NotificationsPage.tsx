import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Bell, CheckCheck, Clock, ExternalLink, Inbox, Package, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/app/auth/AuthContext';
import { PageHeader } from '@/app/components/PageHeader';
import { StatusBadge } from '@/app/components/StatusBadge';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { ALL_SUCURSALES, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { formatDateTime } from '@/app/lib/format';
import {
  fetchNotifications,
  markNotificationAsRead,
  markNotificationsAsRead,
  type NotificationItem,
} from '@/app/services/notificationsService';

function notificationTypeLabel(type: string) {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (value) => value.toUpperCase());
}

function getNotificationVisuals(tipo: string) {
  switch (tipo) {
    case 'TAREA_ATRASADA':
      return {
        badgeClass: 'border-orange-200 bg-orange-50 text-orange-700',
        cardClass: 'border-orange-200 bg-orange-50/60 shadow-sm',
        Icon: Clock,
        label: 'Tarea atrasada',
      };
    case 'APROBACION_ATASCADA':
      return {
        badgeClass: 'border-amber-200 bg-amber-50 text-amber-700',
        cardClass: 'border-amber-200 bg-amber-50/60 shadow-sm',
        Icon: ShieldAlert,
        label: 'Aprobación detenida',
      };
    case 'REPUESTO_PENDIENTE':
      return {
        badgeClass: 'border-purple-200 bg-purple-50 text-purple-700',
        cardClass: 'border-purple-200 bg-purple-50/60 shadow-sm',
        Icon: Package,
        label: 'Repuesto pendiente',
      };
    default:
      return {
        badgeClass: 'border-blue-200 bg-white text-blue-700',
        cardClass: 'border-blue-200 bg-blue-50/60 shadow-sm',
        Icon: Bell,
        label: notificationTypeLabel(tipo),
      };
  }
}

export function NotificationsPage() {
  const { user } = useAuth();
  const sucursalScope = useSucursalScope();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.leida),
    [notifications],
  );

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const scopedSucursalId = sucursalScope.effectiveSucursalId === ALL_SUCURSALES
        ? undefined
        : sucursalScope.effectiveSucursalId;
      const data = await fetchNotifications(user?.id, scopedSucursalId, sucursalScope.isAdmin);
      setNotifications(data);
    } catch (loadError) {
      console.error(loadError);
      setError('No se pudieron cargar las notificaciones.');
    } finally {
      setLoading(false);
    }
  }, [sucursalScope.effectiveSucursalId, sucursalScope.isAdmin, user?.id]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    setSavingId(notificationId);

    try {
      await markNotificationAsRead(notificationId);
      setNotifications((current) => current.map((notification) => (
        notification.id === notificationId ? { ...notification, leida: true } : notification
      )));
      toast.success('Notificacion marcada como leida');
    } catch (markError) {
      console.error(markError);
      toast.error('No se pudo actualizar la notificacion');
    } finally {
      setSavingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = unreadNotifications.map((notification) => notification.id);
    setSavingId('all');

    try {
      await markNotificationsAsRead(unreadIds);
      setNotifications((current) => current.map((notification) => ({ ...notification, leida: true })));
      toast.success('Notificaciones marcadas como leidas');
    } catch (markError) {
      console.error(markError);
      toast.error('No se pudieron actualizar las notificaciones');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        description="Alertas internas generadas por ordenes, repuestos, calidad y entregas pendientes."
        icon={Bell}
        action={(
          <>
            <Button
              type="button"
              variant="outline"
              onClick={loadNotifications}
              disabled={loading}
              aria-label="Actualizar notificaciones"
            >
              <RefreshCw className={loading ? 'animate-spin' : ''} />
              Actualizar
            </Button>
            <Button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={!unreadNotifications.length || savingId === 'all'}
            >
              <CheckCheck />
              Marcar todas leidas
            </Button>
          </>
        )}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SucursalScopeControl
          isAdmin={sucursalScope.isAdmin}
          sucursales={sucursalScope.sucursales}
          selectedSucursalId={sucursalScope.selectedSucursalId}
          selectedSucursalName={sucursalScope.selectedSucursalName}
          onSucursalChange={sucursalScope.setSelectedSucursalId}
        />
        <Badge className="border-blue-200 bg-blue-50 text-blue-700" variant="outline">
          {unreadNotifications.length} sin leer
        </Badge>
        <Badge className="border-gray-200 bg-white text-gray-700" variant="outline">
          {notifications.length} total
        </Badge>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
          ))}
        </div>
      ) : notifications.length ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.leida
                ? 'border-gray-200 bg-white'
                : getNotificationVisuals(notification.tipo).cardClass}
            >
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    {(() => {
                      const { badgeClass, Icon, label } = getNotificationVisuals(notification.tipo);
                      return (
                        <Badge
                          className={notification.leida ? 'border-gray-200 bg-gray-50 text-gray-600' : badgeClass}
                          variant="outline"
                        >
                          <Icon className="mr-1 h-3 w-3" />
                          {label}
                        </Badge>
                      );
                    })()}
                    {!notification.leida ? (
                      <Badge className="bg-blue-600 text-white">Nueva</Badge>
                    ) : null}
                    <span className="text-xs text-gray-500">{formatDateTime(notification.created_at)}</span>
                  </div>

                  <p className="text-sm leading-6 text-gray-900">{notification.mensaje}</p>

                  {notification.orden ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">{notification.orden.numero_orden}</span>
                      <StatusBadge status={notification.orden.estado} />
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                  {notification.orden_id ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/ordenes/${notification.orden_id}`}>
                        <ExternalLink />
                        Ver orden
                      </Link>
                    </Button>
                  ) : null}
                  {!notification.leida ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleMarkAsRead(notification.id)}
                      disabled={savingId === notification.id}
                    >
                      <CheckCheck />
                      Leida
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 text-center">
          <Inbox className="mb-3 h-10 w-10 text-gray-400" />
          <h2 className="text-lg font-medium text-gray-900">Sin notificaciones</h2>
          <p className="mt-1 max-w-md text-sm text-gray-500">
            No hay alertas pendientes para tu usuario en este momento.
          </p>
        </div>
      )}
    </div>
  );
}
