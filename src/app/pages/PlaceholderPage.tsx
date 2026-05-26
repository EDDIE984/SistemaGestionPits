import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';
import { PageHeader } from '@/app/components/PageHeader';
import { Card, CardContent } from '@/app/components/ui/card';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  const Icon = icon ?? Construction;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <PageHeader icon={Icon} title={title} description={description} />
      <Card>
        <CardContent className="p-8">
          <div className="max-w-2xl">
            <p className="text-sm text-gray-600">
              Pantalla reservada dentro del MVP. La ruta ya existe para mantener la arquitectura del flujo y conectar el CRUD o proceso especifico en el siguiente bloque.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
