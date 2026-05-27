import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, Car, Loader2, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/auth/AuthContext';
import { PageHeader } from '@/app/components/PageHeader';
import { SucursalScopeControl } from '@/app/components/SucursalScopeControl';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { ALL_SUCURSALES, useSucursalScope } from '@/app/hooks/useSucursalScope';
import { lookupCedula, lookupPlaca } from '@/app/services/externalLookups';
import { fetchAseguradoras } from '@/app/services/configService';
import type { AseguradoraOption } from '@/app/services/configService';
import { addMockOrder } from '@/app/store/mockOrders';

interface OrderFormState {
  sucursal_id: string;
  aseguradora_id: string;
  cedula: string;
  nombre: string;
  telefono: string;
  correo: string;
  direccion: string;
  ciudad: string;
  placa: string;
  marca: string;
  modelo: string;
  chasis: string;
  motor: string;
  observaciones: string;
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sucursalScope = useSucursalScope();
  const [form, setForm] = useState<OrderFormState>({
    sucursal_id: user?.sucursal_id ?? '',
    aseguradora_id: '',
    cedula: '',
    nombre: '',
    telefono: '',
    correo: '',
    direccion: '',
    ciudad: '',
    placa: '',
    marca: '',
    modelo: '',
    chasis: '',
    motor: '',
    observaciones: '',
  });
  const [aseguradoras, setAseguradoras] = useState<AseguradoraOption[]>([]);
  const [isLookingUpCedula, setIsLookingUpCedula] = useState(false);
  const [isLookingUpPlaca, setIsLookingUpPlaca] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupInfo, setLookupInfo] = useState('');

  useEffect(() => {
    fetchAseguradoras().then(setAseguradoras).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!sucursalScope.isAdmin && user?.sucursal_id) {
      setForm((current) => ({ ...current, sucursal_id: user.sucursal_id }));
    }
  }, [sucursalScope.isAdmin, user?.sucursal_id]);

  useEffect(() => {
    if (sucursalScope.isAdmin) {
      setForm((current) => ({
        ...current,
        sucursal_id: sucursalScope.selectedSucursalId === ALL_SUCURSALES ? '' : sucursalScope.selectedSucursalId,
      }));
    }
  }, [sucursalScope.isAdmin, sucursalScope.selectedSucursalId]);

  const updateField = (field: keyof OrderFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.sucursal_id || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addMockOrder({
        sucursal_id: form.sucursal_id,
        aseguradora_id: form.aseguradora_id || null,
        cedula: form.cedula.trim() || undefined,
        nombre: form.nombre.trim() || 'Cliente sin nombre',
        telefono: form.telefono.trim() || undefined,
        correo: form.correo.trim() || undefined,
        direccion: form.direccion.trim() || undefined,
        ciudad: form.ciudad.trim() || undefined,
        placa: form.placa.trim().toUpperCase(),
        marca: form.marca.trim() || undefined,
        modelo: form.modelo.trim() || undefined,
        chasis: form.chasis.trim() || undefined,
        motor: form.motor.trim() || undefined,
        observaciones: form.observaciones.trim() || undefined,
      });
      navigate('/ordenes');
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Error al guardar la orden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCedulaLookup = async () => {
    const cedula = form.cedula.trim();
    if (!cedula || isLookingUpCedula) return;

    setLookupError('');
    setLookupInfo('');
    setIsLookingUpCedula(true);

    try {
      const result = await lookupCedula(cedula);
      setForm((current) => ({
        ...current,
        nombre: result.nombre ?? current.nombre,
        direccion: result.direccion ?? current.direccion,
        telefono: result.telefono ?? current.telefono,
        correo: result.correo ?? current.correo,
        ciudad: result.ciudad ?? current.ciudad,
      }));
      setLookupInfo('Datos del cliente consultados correctamente.');
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'No se pudo consultar la cedula.');
    } finally {
      setIsLookingUpCedula(false);
    }
  };

  const handlePlacaLookup = async () => {
    const placa = form.placa.trim().toUpperCase();
    if (!placa || isLookingUpPlaca) return;

    setLookupError('');
    setLookupInfo('');
    setIsLookingUpPlaca(true);

    try {
      const result = await lookupPlaca(placa);
      setForm((current) => ({
        ...current,
        placa: result.placa ?? placa,
        marca: result.marca ?? current.marca,
        modelo: result.modelo ?? current.modelo,
        chasis: result.chasis ?? current.chasis,
        motor: result.motor ?? current.motor,
      }));
      setLookupInfo('Datos del vehiculo consultados correctamente.');
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'No se pudo consultar la placa.');
    } finally {
      setIsLookingUpPlaca(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader
        icon={Car}
        title="Nueva orden"
        description="Formulario de ingreso con autocompletado para cedula/RUC y placa mediante servicios externos."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Datos de recepcion</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {lookupError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{lookupError}</AlertDescription>
                </Alert>
              ) : null}

              {lookupInfo ? (
                <Alert>
                  <Search className="h-4 w-4" />
                  <AlertTitle>Consulta completada</AlertTitle>
                  <AlertDescription>{lookupInfo}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sucursal de ingreso</Label>
                  <SucursalScopeControl
                    isAdmin={sucursalScope.isAdmin}
                    sucursales={sucursalScope.sucursales}
                    selectedSucursalId={sucursalScope.selectedSucursalId}
                    selectedSucursalName={sucursalScope.selectedSucursalName}
                    onSucursalChange={(sucursalId) => {
                      sucursalScope.setSelectedSucursalId(sucursalId);
                      updateField('sucursal_id', sucursalId === ALL_SUCURSALES ? '' : sucursalId);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Aseguradora</Label>
                  <Select value={form.aseguradora_id} onValueChange={(v) => updateField('aseguradora_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                    <SelectContent>
                      {aseguradoras.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <section>
                <h2 className="mb-4 text-xl text-gray-900">Cliente</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cedula">Cedula o RUC</Label>
                    <div className="flex gap-2">
                      <Input
                        id="cedula"
                        placeholder="1714639026"
                        value={form.cedula}
                        onChange={(event) => updateField('cedula', event.target.value)}
                        onBlur={handleCedulaLookup}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Consultar cedula"
                        disabled={isLookingUpCedula}
                        onClick={handleCedulaLookup}
                      >
                        {isLookingUpCedula ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre completo</Label>
                    <Input id="nombre" placeholder="Nombre del cliente" value={form.nombre} onChange={(event) => updateField('nombre', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Telefono</Label>
                    <Input id="telefono" type="tel" placeholder="0999999999" value={form.telefono} onChange={(event) => updateField('telefono', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correo">Correo</Label>
                    <Input id="correo" type="email" placeholder="cliente@correo.com" value={form.correo} onChange={(event) => updateField('correo', event.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="direccion">Direccion</Label>
                    <Input id="direccion" placeholder="Direccion del cliente" value={form.direccion} onChange={(event) => updateField('direccion', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <Input id="ciudad" placeholder="Quito" value={form.ciudad} onChange={(event) => updateField('ciudad', event.target.value)} />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-xl text-gray-900">Vehiculo</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="placa">Placa</Label>
                    <div className="flex gap-2">
                      <Input
                        id="placa"
                        placeholder="HBE7190"
                        value={form.placa}
                        onChange={(event) => updateField('placa', event.target.value.toUpperCase())}
                        onBlur={handlePlacaLookup}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Consultar placa"
                        disabled={isLookingUpPlaca}
                        onClick={handlePlacaLookup}
                      >
                        {isLookingUpPlaca ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="marca">Marca</Label>
                    <Input id="marca" placeholder="Toyota" value={form.marca} onChange={(event) => updateField('marca', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelo">Modelo</Label>
                    <Input id="modelo" placeholder="Fortuner" value={form.modelo} onChange={(event) => updateField('modelo', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chasis">Chasis</Label>
                    <Input id="chasis" placeholder="Numero de chasis" value={form.chasis} onChange={(event) => updateField('chasis', event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motor">Motor</Label>
                    <Input id="motor" placeholder="Numero de motor" value={form.motor} onChange={(event) => updateField('motor', event.target.value)} />
                  </div>
                </div>
              </section>

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  rows={4}
                  placeholder="Condicion de ingreso, novedades visibles o instrucciones iniciales"
                  value={form.observaciones}
                  onChange={(event) => updateField('observaciones', event.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/ordenes')}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || !form.sucursal_id}>
                  {isSubmitting ? 'Guardando...' : 'Guardar orden'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estado inicial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-600">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
              La orden se creara directamente en levantamiento de proforma. El ingreso queda cumplido al registrar la fecha de entrada.
            </div>
            <p>Las consultas externas se realizan via servicios de cedula y placa. Asegurate de tener conexion.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
