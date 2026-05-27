interface LookupRecord {
  [key: string]: unknown;
}

export interface CedulaLookupResult {
  nombre?: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  ciudad?: string;
  raw: unknown;
}

export interface PlacaLookupResult {
  placa?: string;
  marca?: string;
  modelo?: string;
  chasis?: string;
  motor?: string;
  anio?: string;
  color?: string;
  raw: unknown;
}

function asRecord(value: unknown): LookupRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as LookupRecord;
  }
  return {};
}

function firstRecord(value: unknown): LookupRecord {
  if (Array.isArray(value)) return asRecord(value[0]);

  const record = asRecord(value);
  const candidates = [
    record.data,
    record.datos,
    record.result,
    record.resultado,
    record.response,
    record.consulta,
    record.vehiculo,
    record.vehicle,
    record.car,
    record.auto,
    record.persona,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return asRecord(candidate[0]);
    const candidateRecord = asRecord(candidate);
    if (Object.keys(candidateRecord).length > 0) return candidateRecord;
  }

  return record;
}

function pickString(record: LookupRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function joinStrings(values: Array<string | undefined>) {
  const parts = values.filter((value): value is string => Boolean(value?.trim()));
  return parts.length ? parts.join(', ') : undefined;
}

async function invokeExternalLookup(type: 'cedula' | 'placa', value: string) {
  const response = await fetch('/api/external-lookup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, value }),
  });
  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (response.status === 404) {
    throw new Error('No se encontro /api/external-lookup. En local usa vercel dev; en produccion revisa que Vercel haya redeployado la funcion.');
  }

  if (!response.ok || (payload && typeof payload === 'object' && 'error' in payload)) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error: unknown }).error)
      : `No se pudo consultar ${type}.`;
    throw new Error(message);
  }

  return payload;
}

export async function lookupCedula(cedula: string): Promise<CedulaLookupResult> {
  const payload = await invokeExternalLookup('cedula', cedula);
  const record = firstRecord(payload);
  const calleDomicilio = pickString(record, ['calleDomicilio', 'calle_domicilio']);
  const lugarDomicilio = pickString(record, ['lugarDomicilio', 'lugar_domicilio']);

  return {
    nombre: pickString(record, [
      'nombre',
      'nombres',
      'nombreCompleto',
      'nombre_completo',
      'razonSocial',
      'razon_social',
      'cliente',
    ]),
    direccion: joinStrings([
      calleDomicilio,
      lugarDomicilio,
    ]) ?? pickString(record, ['direccion', 'domicilio', 'calle']),
    telefono: pickString(record, ['telefono', 'celular', 'movil', 'phone']),
    correo: pickString(record, ['correo', 'email', 'mail']),
    ciudad: pickString(record, ['ciudad', 'canton', 'localidad']) ?? lugarDomicilio,
    raw: payload,
  };
}

export async function lookupPlaca(placa: string): Promise<PlacaLookupResult> {
  const payload = await invokeExternalLookup('placa', placa);
  const record = firstRecord(payload);

  return {
    placa: pickString(record, ['Placa', 'placa', 'plate', 'numeroPlaca', 'numero_placa']),
    marca: pickString(record, ['Marca', 'marca', 'brand', 'descripcionMarca', 'descripcion_marca']),
    modelo: pickString(record, ['Modelo', 'modelo', 'model', 'descripcionModelo', 'descripcion_modelo']),
    chasis: pickString(record, ['Chasis', 'chasis', 'vin', 'serie', 'numeroChasis', 'numero_chasis']),
    motor: pickString(record, ['Motor', 'motor', 'numeroMotor', 'numero_motor']),
    anio: pickString(record, ['Año', 'anio', 'ano', 'year', 'modeloAnio', 'modelo_anio']),
    color: pickString(record, ['Color', 'color']),
    raw: payload,
  };
}
