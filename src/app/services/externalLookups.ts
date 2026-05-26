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

async function readJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function lookupCedula(cedula: string): Promise<CedulaLookupResult> {
  const baseUrl = import.meta.env.VITE_API_CEDULA_URL as string | undefined;
  const apiKey = import.meta.env.VITE_API_CEDULA_KEY as string | undefined;

  if (!baseUrl || !apiKey) {
    throw new Error('Faltan VITE_API_CEDULA_URL o VITE_API_CEDULA_KEY en .env');
  }

  const url = new URL(baseUrl);
  url.searchParams.set('Cedula', cedula);
  url.searchParams.set('Apikey', apiKey);

  const response = await fetch(url.toString());
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(`Consulta de cedula fallida (${response.status})`);
  }

  const record = firstRecord(payload);

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
    direccion: pickString(record, ['direccion', 'domicilio', 'calle']),
    telefono: pickString(record, ['telefono', 'celular', 'movil', 'phone']),
    correo: pickString(record, ['correo', 'email', 'mail']),
    ciudad: pickString(record, ['ciudad', 'canton', 'localidad']),
    raw: payload,
  };
}

export async function lookupPlaca(placa: string): Promise<PlacaLookupResult> {
  const baseUrl = import.meta.env.VITE_API_PLACA_URL as string | undefined;
  const token = import.meta.env.VITE_API_PLACA_TOKEN as string | undefined;

  if (!baseUrl || !token) {
    throw new Error('Faltan VITE_API_PLACA_URL o VITE_API_PLACA_TOKEN en .env');
  }

  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(placa)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(`Consulta de placa fallida (${response.status})`);
  }

  const record = firstRecord(payload);

  return {
    placa: pickString(record, ['placa', 'plate']),
    marca: pickString(record, ['marca', 'brand']),
    modelo: pickString(record, ['modelo', 'model']),
    chasis: pickString(record, ['chasis', 'vin', 'serie']),
    motor: pickString(record, ['motor', 'numeroMotor', 'numero_motor']),
    anio: pickString(record, ['anio', 'ano', 'year']),
    color: pickString(record, ['color']),
    raw: payload,
  };
}
