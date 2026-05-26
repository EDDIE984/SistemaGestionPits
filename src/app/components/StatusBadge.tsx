import type { IslandSignal, OrderStatus, TaskStatus } from '@/app/types';
import { orderStatusLabel, signalClasses, signalLabel, statusBadgeClasses, taskStatusLabel } from '@/app/lib/format';

interface StatusBadgeProps {
  status?: OrderStatus;
  taskStatus?: TaskStatus;
  signal?: IslandSignal;
}

export function StatusBadge({ status, taskStatus, signal }: StatusBadgeProps) {
  if (signal) {
    return (
      <span className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-xs font-medium ${signalClasses(signal)}`}>
        {signalLabel(signal)}
      </span>
    );
  }

  if (taskStatus) {
    return (
      <span className="inline-flex w-fit items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
        {taskStatusLabel(taskStatus)}
      </span>
    );
  }

  if (!status) return null;

  return (
    <span className={`inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium ${statusBadgeClasses(status)}`}>
      {orderStatusLabel(status)}
    </span>
  );
}
