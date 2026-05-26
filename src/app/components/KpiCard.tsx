import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

interface KpiCardProps {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: 'blue' | 'green' | 'orange' | 'red' | 'cyan';
}

const toneClasses = {
  blue: 'from-blue-50 border-blue-200 text-blue-600',
  green: 'from-green-50 border-green-200 text-green-600',
  orange: 'from-orange-50 border-orange-200 text-orange-600',
  red: 'from-red-50 border-red-200 text-red-600',
  cyan: 'from-cyan-50 border-cyan-200 text-cyan-600',
};

export function KpiCard({ title, value, detail, icon: Icon, tone }: KpiCardProps) {
  return (
    <Card className={`bg-gradient-to-br to-white ${toneClasses[tone]}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Icon className={`h-4 w-4 ${toneClasses[tone].split(' ').at(-1)}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${toneClasses[tone].split(' ').at(-1)}`}>{value}</div>
        <p className="mt-1 text-xs text-gray-500">{detail}</p>
      </CardContent>
    </Card>
  );
}
