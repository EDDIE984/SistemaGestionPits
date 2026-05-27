import { ALL_SUCURSALES } from '@/app/hooks/useSucursalScope';
import type { SucursalOption } from '@/app/services/configService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

interface SucursalScopeControlProps {
  isAdmin: boolean;
  sucursales: SucursalOption[];
  selectedSucursalId: string;
  selectedSucursalName: string;
  onSucursalChange: (sucursalId: string) => void;
}

export function SucursalScopeControl({
  isAdmin,
  sucursales,
  selectedSucursalId,
  selectedSucursalName,
  onSucursalChange,
}: SucursalScopeControlProps) {
  if (isAdmin) {
    return (
      <Select value={selectedSucursalId} onValueChange={onSucursalChange}>
        <SelectTrigger>
          <SelectValue placeholder="Sucursal" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_SUCURSALES}>Todas las sucursales</SelectItem>
          {sucursales.map((sucursal) => (
            <SelectItem key={sucursal.id} value={sucursal.id}>
              {sucursal.nombre}{sucursal.ciudad ? ` - ${sucursal.ciudad}` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs font-medium uppercase text-gray-500">Sucursal asignada</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{selectedSucursalName}</p>
    </div>
  );
}
