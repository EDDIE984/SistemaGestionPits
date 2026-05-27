import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/auth/AuthContext';
import { fetchSucursales, type SucursalOption } from '@/app/services/configService';

export const ALL_SUCURSALES = '__all_sucursales__';

export function useSucursalScope() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'ADMINISTRADOR';
  const [sucursales, setSucursales] = useState<SucursalOption[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState(ALL_SUCURSALES);

  useEffect(() => {
    if (!isAdmin) {
      setSucursales([]);
      setSelectedSucursalId(user?.sucursal_id ?? ALL_SUCURSALES);
      return;
    }

    fetchSucursales()
      .then(setSucursales)
      .catch(() => setSucursales([]));
  }, [isAdmin, user?.sucursal_id]);

  const effectiveSucursalId = isAdmin
    ? selectedSucursalId
    : user?.sucursal_id ?? ALL_SUCURSALES;

  const selectedSucursalName = useMemo(() => {
    if (!isAdmin) return user?.sucursal_nombre ?? 'Sin sucursal asignada';
    if (selectedSucursalId === ALL_SUCURSALES) return 'Todas las sucursales';
    return sucursales.find((sucursal) => sucursal.id === selectedSucursalId)?.nombre ?? 'Sucursal';
  }, [isAdmin, selectedSucursalId, sucursales, user?.sucursal_nombre]);

  return {
    user,
    isAdmin,
    sucursales,
    selectedSucursalId,
    selectedSucursalName,
    effectiveSucursalId,
    setSelectedSucursalId,
  };
}

export function matchesSucursalScope(rowSucursalId: string | undefined, effectiveSucursalId: string) {
  return effectiveSucursalId === ALL_SUCURSALES || rowSucursalId === effectiveSucursalId;
}
