import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Database, Edit2, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Switch } from '@/app/components/ui/switch';
import { Textarea } from '@/app/components/ui/textarea';
import { supabase } from '@/app/lib/supabase';

type CatalogRow = Record<string, any>;
type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'password';

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  lookup?: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  render?: (row: CatalogRow) => React.ReactNode;
}

interface CatalogConfig {
  slug: string;
  table: string;
  title: string;
  description: string;
  select: string;
  orderBy: string;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  activeField?: string;
}

interface LookupOption {
  id: string;
  label: string;
}

const NONE_VALUE = '__none__';

const formatBoolean = (value: boolean) => (
  <Badge variant={value ? 'default' : 'secondary'} className={value ? 'bg-emerald-600' : ''}>
    {value ? 'Activo' : 'Inactivo'}
  </Badge>
);

const getNestedLabel = (row: CatalogRow, key: string, fallback = 'Sin asignar') => {
  const value = key.split('.').reduce<any>((current, part) => current?.[part], row);
  return value ?? fallback;
};

const catalogConfigs: Record<string, CatalogConfig> = {
  companias: {
    slug: 'companias',
    table: 'companias',
    title: 'Companias',
    description: 'Datos legales y principales de la empresa.',
    select: '*',
    orderBy: 'nombre',
    activeField: 'activo',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'ruc', label: 'RUC', type: 'text' },
      { key: 'direccion', label: 'Direccion', type: 'text' },
      { key: 'telefono', label: 'Telefono', type: 'text' },
      { key: 'correo', label: 'Correo', type: 'text' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
    ],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'ruc', label: 'RUC' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'correo', label: 'Correo' },
      { key: 'activo', label: 'Estado', render: (row) => formatBoolean(row.activo) },
    ],
  },
  sucursales: {
    slug: 'sucursales',
    table: 'sucursales',
    title: 'Sucursales',
    description: 'Talleres fisicos, ciudades y contactos.',
    select: '*, companias(nombre)',
    orderBy: 'nombre',
    activeField: 'activo',
    fields: [
      { key: 'compania_id', label: 'Compania', type: 'select', lookup: 'companias', required: true },
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'direccion', label: 'Direccion', type: 'text' },
      { key: 'ciudad', label: 'Ciudad', type: 'text' },
      { key: 'telefono', label: 'Telefono', type: 'text' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
    ],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'compania', label: 'Compania', render: (row) => getNestedLabel(row, 'companias.nombre') },
      { key: 'ciudad', label: 'Ciudad' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'activo', label: 'Estado', render: (row) => formatBoolean(row.activo) },
    ],
  },
  aseguradoras: {
    slug: 'aseguradoras',
    table: 'aseguradoras',
    title: 'Aseguradoras',
    description: 'Companias aseguradoras y contactos.',
    select: '*',
    orderBy: 'nombre',
    activeField: 'activo',
    fields: [
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'ruc', label: 'RUC', type: 'text' },
      { key: 'contacto', label: 'Contacto', type: 'text' },
      { key: 'telefono', label: 'Telefono', type: 'text' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
    ],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'ruc', label: 'RUC' },
      { key: 'contacto', label: 'Contacto' },
      { key: 'telefono', label: 'Telefono' },
      { key: 'activo', label: 'Estado', render: (row) => formatBoolean(row.activo) },
    ],
  },
  islas: {
    slug: 'islas',
    table: 'islas',
    title: 'Islas',
    description: 'Areas de trabajo por sucursal.',
    select: '*, sucursales(nombre)',
    orderBy: 'nombre',
    activeField: 'activo',
    fields: [
      { key: 'sucursal_id', label: 'Sucursal', type: 'select', lookup: 'sucursales', required: true },
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'descripcion', label: 'Descripcion', type: 'textarea' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
    ],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'sucursal', label: 'Sucursal', render: (row) => getNestedLabel(row, 'sucursales.nombre') },
      { key: 'descripcion', label: 'Descripcion' },
      { key: 'activo', label: 'Estado', render: (row) => formatBoolean(row.activo) },
    ],
  },
  usuarios: {
    slug: 'usuarios',
    table: 'usuarios',
    title: 'Usuarios',
    description: 'Accesos, roles y sucursal asignada.',
    select: '*, sucursales(nombre), roles(nombre)',
    orderBy: 'nombre',
    activeField: 'activo',
    fields: [
      { key: 'sucursal_id', label: 'Sucursal', type: 'select', lookup: 'sucursales', required: true },
      { key: 'rol_id', label: 'Rol', type: 'select', lookup: 'roles', required: true },
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'username', label: 'Usuario', type: 'text', required: true },
      { key: 'password_hash', label: 'Contrasena', type: 'password' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
    ],
    columns: [
      { key: 'nombre', label: 'Nombre' },
      { key: 'username', label: 'Usuario' },
      { key: 'rol', label: 'Rol', render: (row) => getNestedLabel(row, 'roles.nombre') },
      { key: 'sucursal', label: 'Sucursal', render: (row) => getNestedLabel(row, 'sucursales.nombre') },
      { key: 'activo', label: 'Estado', render: (row) => formatBoolean(row.activo) },
    ],
  },
  tarifas: {
    slug: 'tarifas',
    table: 'tarifas_hora_hombre',
    title: 'Tarifas',
    description: 'Hora hombre por sucursal, isla o tecnico.',
    select: '*, sucursales(nombre), islas(nombre), tecnicos(id, usuarios(nombre))',
    orderBy: 'fecha_desde',
    fields: [
      { key: 'sucursal_id', label: 'Sucursal', type: 'select', lookup: 'sucursales', required: true },
      { key: 'isla_id', label: 'Isla', type: 'select', lookup: 'islas' },
      { key: 'tecnico_id', label: 'Tecnico', type: 'select', lookup: 'tecnicos' },
      { key: 'valor_hora', label: 'Valor hora', type: 'number', required: true },
      { key: 'fecha_desde', label: 'Fecha desde', type: 'date', required: true },
      { key: 'fecha_hasta', label: 'Fecha hasta', type: 'date' },
    ],
    columns: [
      { key: 'sucursal', label: 'Sucursal', render: (row) => getNestedLabel(row, 'sucursales.nombre') },
      { key: 'isla', label: 'Isla', render: (row) => getNestedLabel(row, 'islas.nombre', 'Todas') },
      { key: 'tecnico', label: 'Tecnico', render: (row) => getNestedLabel(row, 'tecnicos.usuarios.nombre', 'Todos') },
      { key: 'valor_hora', label: 'Valor hora', render: (row) => `$${Number(row.valor_hora ?? 0).toFixed(2)}` },
      { key: 'fecha_desde', label: 'Desde' },
      { key: 'fecha_hasta', label: 'Hasta', render: (row) => row.fecha_hasta ?? 'Vigente' },
    ],
  },
  'catalogo-operaciones': {
    slug: 'catalogo-operaciones',
    table: 'operaciones_catalogo',
    title: 'Catalogo de operaciones',
    description: 'Flat rate y tiempos estandar.',
    select: '*, islas(nombre)',
    orderBy: 'nombre',
    activeField: 'activo',
    fields: [
      { key: 'isla_id', label: 'Isla', type: 'select', lookup: 'islas', required: true },
      { key: 'nombre', label: 'Nombre', type: 'text', required: true },
      { key: 'tiempo_estandar_horas', label: 'Tiempo estandar horas', type: 'number', required: true },
      { key: 'codigo_audatex', label: 'Codigo Audatex', type: 'text' },
      { key: 'descripcion', label: 'Descripcion', type: 'textarea' },
      { key: 'activo', label: 'Activo', type: 'boolean' },
    ],
    columns: [
      { key: 'nombre', label: 'Operacion' },
      { key: 'isla', label: 'Isla', render: (row) => getNestedLabel(row, 'islas.nombre') },
      { key: 'tiempo_estandar_horas', label: 'Horas' },
      { key: 'codigo_audatex', label: 'Audatex' },
      { key: 'activo', label: 'Estado', render: (row) => formatBoolean(row.activo) },
    ],
  },
};

const lookupQueries: Record<string, { table: string; select: string; orderBy: string; map: (row: CatalogRow) => string }> = {
  companias: { table: 'companias', select: 'id, nombre', orderBy: 'nombre', map: (row) => row.nombre },
  sucursales: { table: 'sucursales', select: 'id, nombre, ciudad', orderBy: 'nombre', map: (row) => `${row.nombre}${row.ciudad ? ` - ${row.ciudad}` : ''}` },
  islas: { table: 'islas', select: 'id, nombre', orderBy: 'nombre', map: (row) => row.nombre },
  roles: { table: 'roles', select: 'id, nombre', orderBy: 'nombre', map: (row) => row.nombre },
  tecnicos: { table: 'tecnicos', select: 'id, usuarios(nombre)', orderBy: 'id', map: (row) => row.usuarios?.nombre ?? row.id },
};

function cleanPayload(config: CatalogConfig, formData: CatalogRow) {
  return config.fields.reduce<CatalogRow>((payload, field) => {
    const rawValue = formData[field.key];
    if (field.type === 'number') {
      payload[field.key] = rawValue === '' || rawValue === undefined || rawValue === null ? null : Number(rawValue);
      return payload;
    }
    if (field.type === 'boolean') {
      payload[field.key] = Boolean(rawValue);
      return payload;
    }
    payload[field.key] = rawValue === '' || rawValue === undefined ? null : rawValue;
    return payload;
  }, {});
}

async function saveUser(formData: CatalogRow, currentRow: CatalogRow | null) {
  return supabase.rpc('upsert_usuario', {
    p_id: currentRow?.id ?? null,
    p_sucursal_id: formData.sucursal_id,
    p_rol_id: formData.rol_id,
    p_nombre: formData.nombre,
    p_username: formData.username,
    p_password: formData.password_hash || null,
    p_email: formData.email || null,
    p_activo: formData.activo ?? true,
  });
}

function getDefaultFormData(config: CatalogConfig) {
  return config.fields.reduce<CatalogRow>((data, field) => {
    if (field.type === 'boolean') data[field.key] = true;
    if (field.type === 'date' && field.required) data[field.key] = new Date().toISOString().slice(0, 10);
    return data;
  }, {});
}

export function CatalogMaintenancePage() {
  const { catalogo } = useParams();
  const navigate = useNavigate();
  const config = catalogo ? catalogConfigs[catalogo] : undefined;
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [lookups, setLookups] = useState<Record<string, LookupOption[]>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRow, setCurrentRow] = useState<CatalogRow | null>(null);
  const [formData, setFormData] = useState<CatalogRow>({});

  const loadRows = async () => {
    if (!config) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from(config.table)
      .select(config.select)
      .order(config.orderBy, { ascending: true });

    if (error) {
      toast.error(`No se pudo cargar ${config.title}`);
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setIsLoading(false);
  };

  const loadLookups = async () => {
    if (!config) return;
    const lookupKeys = Array.from(new Set(config.fields.map((field) => field.lookup).filter(Boolean))) as string[];
    const lookupEntries = await Promise.all(
      lookupKeys.map(async (key) => {
        const query = lookupQueries[key];
        if (!query) return [key, []] as const;
        const { data, error } = await supabase.from(query.table).select(query.select).order(query.orderBy);
        return [key, error ? [] : (data ?? []).map((row) => ({ id: row.id, label: query.map(row) }))] as const;
      }),
    );
    setLookups(Object.fromEntries(lookupEntries));
  };

  useEffect(() => {
    loadRows();
    loadLookups();
  }, [catalogo]);

  const filteredRows = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query));
  }, [rows, searchTerm]);

  const openCreateDialog = () => {
    if (!config) return;
    setCurrentRow(null);
    setFormData(getDefaultFormData(config));
    setIsDialogOpen(true);
  };

  const openEditDialog = (row: CatalogRow) => {
    setCurrentRow(row);
    setFormData(config?.slug === 'usuarios' ? { ...row, password_hash: '' } : row);
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!config) return;
    const missingField = config.fields.find((field) => field.required && !formData[field.key]);
    if (missingField) {
      toast.error(`Completa el campo ${missingField.label}`);
      return;
    }
    if (config.slug === 'usuarios' && !currentRow && !formData.password_hash) {
      toast.error('Completa el campo Contrasena');
      return;
    }

    setIsSaving(true);
    const { error } = config.slug === 'usuarios'
      ? await saveUser(formData, currentRow)
      : await (
        currentRow
          ? supabase.from(config.table).update(cleanPayload(config, formData)).eq('id', currentRow.id)
          : supabase.from(config.table).insert(cleanPayload(config, formData))
      );

    setIsSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(currentRow ? 'Registro actualizado' : 'Registro creado');
    setIsDialogOpen(false);
    await loadRows();
  };

  const handleDelete = async (row: CatalogRow) => {
    if (!config) return;
    const shouldDelete = window.confirm(
      config.activeField
        ? 'Se marcara este registro como inactivo. Deseas continuar?'
        : 'Se eliminara este registro. Deseas continuar?',
    );
    if (!shouldDelete) return;

    const request = config.activeField
      ? supabase.from(config.table).update({ [config.activeField]: false }).eq('id', row.id)
      : supabase.from(config.table).delete().eq('id', row.id);
    const { error } = await request;

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(config.activeField ? 'Registro inactivado' : 'Registro eliminado');
    await loadRows();
  };

  if (!config) {
    return (
      <div className="p-8">
        <Button variant="outline" onClick={() => navigate('/configuracion')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8">
          <h1 className="text-2xl text-gray-900">Catalogo no encontrado</h1>
          <p className="mt-2 text-gray-600">La seccion solicitada no esta configurada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <button
        onClick={() => navigate('/configuracion')}
        className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Configuracion
      </button>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Database className="h-5 w-5" />
          </div>
          <h1 className="text-3xl text-gray-900">{config.title}</h1>
          <p className="mt-2 text-gray-600">{config.description}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar registros"
              className="pl-9"
            />
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {config.columns.map((column) => (
                  <th key={column.key} className="px-6 py-3 text-left text-xs uppercase tracking-wider text-gray-700">
                    {column.label}
                  </th>
                ))}
                <th className="px-6 py-3 text-right text-xs uppercase tracking-wider text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="px-6 py-10 text-center text-gray-500">
                    Cargando registros...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="px-6 py-10 text-center text-gray-500">
                    No hay registros disponibles
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {config.columns.map((column) => (
                      <td key={column.key} className="max-w-xs truncate px-6 py-4 text-sm text-gray-900">
                        {column.render ? column.render(row) : (row[column.key] ?? '')}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(row)} title="Editar">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(row)} title="Eliminar">
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentRow ? 'Editar' : 'Agregar'} {config.title}</DialogTitle>
            <DialogDescription>Completa los datos del registro.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            {config.fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
                <Label htmlFor={field.key}>{field.label}{field.required ? ' *' : ''}</Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.key}
                    value={formData[field.key] ?? ''}
                    onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                ) : field.type === 'boolean' ? (
                  <div className="flex h-9 items-center">
                    <Switch
                      id={field.key}
                      checked={Boolean(formData[field.key])}
                      onCheckedChange={(checked) => setFormData((current) => ({ ...current, [field.key]: checked }))}
                    />
                  </div>
                ) : field.type === 'select' ? (
                  <Select
                    value={formData[field.key] ?? NONE_VALUE}
                    onValueChange={(value) => setFormData((current) => ({ ...current, [field.key]: value === NONE_VALUE ? null : value }))}
                  >
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {!field.required && <SelectItem value={NONE_VALUE}>Sin asignar</SelectItem>}
                      {(lookups[field.lookup ?? ''] ?? []).map((option) => (
                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.key}
                    type={field.type === 'password' ? 'password' : field.type}
                    step={field.type === 'number' ? '0.01' : undefined}
                    value={formData[field.key] ?? ''}
                    onChange={(event) => setFormData((current) => ({ ...current, [field.key]: event.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
