import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/auth/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const ok = await login(username, password);
      if (!ok) {
        setError('Usuario o contraseña incorrectos.');
        return;
      }
      navigate(from, { replace: true });
    } catch {
      setError('Error de conexion. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo — marca */}
      <section className="hidden lg:flex lg:w-[55%] flex-col justify-between bg-white border-r border-gray-100 p-12">
        <div>
          <img
            src="/images/Logo_Pits.webp"
            alt="PITS Latonería y Pintura Express"
            className="w-[200px]"
          />
          <hr className="mt-6 border-0 h-[3px] bg-[#4DBFB8]" />
        </div>

        <div className="max-w-lg">
          <p className="text-xs font-medium uppercase tracking-widest text-[#4DBFB8]">
            Gestión de Taller
          </p>
          <h2 className="mt-4 text-4xl font-medium leading-tight text-gray-900">
            Ordenes, islas y tiempos reales en una sola pantalla de trabajo.
          </h2>
        <p className="mt-6 text-xs text-gray-400">© OneWayEc</p>
      </section>

      {/* Panel derecho — formulario */}
      <main className="flex w-full lg:w-[45%] items-center justify-center bg-[#f8fafc] p-8">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <img
            src="/images/Logo_Pits.webp"
            alt="PITS"
            className="mb-6 w-[120px] lg:hidden"
          />

          <h1 className="text-2xl font-semibold text-gray-900">Iniciar sesión</h1>
          <p className="mt-1 mb-6 text-sm text-gray-500">
            Ingresa tus credenciales para acceder al sistema.
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No se pudo ingresar</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                disabled={isLoading}
                className="focus-visible:ring-[#4DBFB8]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
                className="focus-visible:ring-[#4DBFB8]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#4DBFB8] text-sm font-medium text-white transition-colors hover:bg-[#3DAFA8] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
