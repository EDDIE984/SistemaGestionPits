type LookupType = 'cedula' | 'placa';

interface LookupRequest {
  type?: LookupType;
  value?: string;
}

function sendJson(response: any, status: number, body: unknown) {
  response.status(status).json(body);
}

async function readResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getRequiredEnv(name: string, fallbackName?: string) {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
  if (!value) {
    throw new Error(`Falta configurar ${name} en Vercel`);
  }
  return value;
}

async function lookupCedula(value: string) {
  const baseUrl = getRequiredEnv('API_CEDULA_URL', 'VITE_API_CEDULA_URL');
  const apiKey = getRequiredEnv('API_CEDULA_KEY', 'VITE_API_CEDULA_KEY');
  const url = new URL(baseUrl);
  url.searchParams.set('Cedula', value);
  url.searchParams.set('Apikey', apiKey);

  const response = await fetch(url.toString());
  const payload = await readResponse(response);

  if (!response.ok) {
    return {
      status: response.status,
      body: { error: `Consulta de cedula fallida (${response.status})`, detail: payload },
    };
  }

  return { status: 200, body: payload };
}

async function lookupPlaca(value: string) {
  const baseUrl = getRequiredEnv('API_PLACA_URL', 'VITE_API_PLACA_URL');
  const token = getRequiredEnv('API_PLACA_TOKEN', 'VITE_API_PLACA_TOKEN');
  const cookie = process.env.API_PLACA_COOKIE || process.env.VITE_API_PLACA_COOKIE;
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(value)}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(url, {
    headers,
  });
  const payload = await readResponse(response);

  if (!response.ok) {
    const detail = typeof payload === 'string'
      ? payload
      : payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : null;

    return {
      status: response.status,
      body: {
        error: detail
          ? `Consulta de placa fallida (${response.status}): ${detail}`
          : `Consulta de placa fallida (${response.status})`,
        detail: payload,
      },
    };
  }

  return { status: 200, body: payload };
}

export default async function handler(request: any, response: any) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Metodo no permitido' });
    return;
  }

  try {
    const body = typeof request.body === 'string'
      ? JSON.parse(request.body) as LookupRequest
      : request.body as LookupRequest;
    const value = body.value?.trim();

    if (!body.type || !['cedula', 'placa'].includes(body.type)) {
      sendJson(response, 400, { error: 'Tipo de consulta no valido' });
      return;
    }

    if (!value) {
      sendJson(response, 400, { error: 'Valor de consulta requerido' });
      return;
    }

    const result = body.type === 'cedula'
      ? await lookupCedula(value)
      : await lookupPlaca(value.toUpperCase());

    sendJson(response, result.status, result.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    sendJson(response, 500, { error: message });
  }
}
