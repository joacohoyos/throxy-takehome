import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/types/lead';

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  pending: {
    label: 'Pending',
    className: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
