import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { AlertCircle, LockKeyhole, Wrench } from 'lucide-react';
import { useAuth } from '@/app/auth/AuthContext';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/app/components/ui/alert';

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
    <div className="grid min-h-screen grid-cols-1 bg-gray-50 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden border-r border-gray-200 bg-white p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">OneWayEc</p>
            <h1 className="text-2xl text-gray-900">Gestion PITS</h1>
          </div>
        </div>

        <div className="max-w-xl">
          <p className="text-sm uppercase tracking-wider text-blue-600">Operacion de taller</p>
          <h2 className="mt-4 text-4xl font-medium leading-tight text-gray-950">
            Ordenes, islas y tiempos reales en una sola pantalla de trabajo.
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Sistema de gestion conectado a Supabase para controlar estados y proyectar el avance del taller.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-2xl font-semibold text-gray-900">4</p>
            <p className="text-gray-500">islas base</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-2xl font-semibold text-gray-900">10</p>
            <p className="text-gray-500">estados</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-2xl font-semibold text-gray-900">Flat</p>
            <p className="text-gray-500">rate listo</p>
          </div>
        </div>
      </section>

      <main className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle>Iniciar sesion</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                />
              </div>

              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Verificando...' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
