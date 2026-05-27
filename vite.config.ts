import { defineConfig } from 'vite'
import fs from 'fs'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function loadLocalEnv() {
  if (!fs.existsSync('.env')) return {}

  return Object.fromEntries(
    fs.readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()]
      }),
  )
}

async function readBody(request: any) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

async function readLookupResponse(response: Response) {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function sendJson(response: any, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

function localExternalLookupPlugin() {
  const localEnv = loadLocalEnv()
  const getEnv = (name: string, fallbackName?: string) => (
    process.env[name]
    || (fallbackName ? process.env[fallbackName] : undefined)
    || localEnv[name]
    || (fallbackName ? localEnv[fallbackName] : undefined)
  )

  return {
    name: 'local-external-lookup-api',
    configureServer(server: any) {
      server.middlewares.use('/api/external-lookup', async (request: any, response: any) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'Metodo no permitido' })
          return
        }

        try {
          const body = await readBody(request)
          const type = body.type
          const value = String(body.value ?? '').trim()

          if (!['cedula', 'placa'].includes(type)) {
            sendJson(response, 400, { error: 'Tipo de consulta no valido' })
            return
          }

          if (!value) {
            sendJson(response, 400, { error: 'Valor de consulta requerido' })
            return
          }

          if (type === 'cedula') {
            const baseUrl = getEnv('API_CEDULA_URL', 'VITE_API_CEDULA_URL')
            const apiKey = getEnv('API_CEDULA_KEY', 'VITE_API_CEDULA_KEY')
            if (!baseUrl || !apiKey) throw new Error('Faltan variables API_CEDULA_URL/API_CEDULA_KEY')

            const url = new URL(baseUrl)
            url.searchParams.set('Cedula', value)
            url.searchParams.set('Apikey', apiKey)
            const serviceResponse = await fetch(url.toString())
            const payload = await readLookupResponse(serviceResponse)
            sendJson(response, serviceResponse.status, payload)
            return
          }

          const baseUrl = getEnv('API_PLACA_URL', 'VITE_API_PLACA_URL')
          const token = getEnv('API_PLACA_TOKEN', 'VITE_API_PLACA_TOKEN')
          const cookie = getEnv('API_PLACA_COOKIE', 'VITE_API_PLACA_COOKIE')
          if (!baseUrl || !token) throw new Error('Faltan variables API_PLACA_URL/API_PLACA_TOKEN')

          const headers: Record<string, string> = {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          }
          if (cookie) headers.Cookie = cookie

          const serviceResponse = await fetch(`${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(value.toUpperCase())}`, { headers })
          const payload = await readLookupResponse(serviceResponse)
          sendJson(response, serviceResponse.status, payload)
        } catch (error) {
          sendJson(response, 500, { error: error instanceof Error ? error.message : 'Error inesperado' })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
    localExternalLookupPlugin(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router'],
          radix: [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
  },
})
