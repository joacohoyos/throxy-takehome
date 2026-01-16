'use client';

import { Progress } from '@/components/ui/progress';
import { useProgress } from '../hooks/use-progress';

export function ProgressIndicator() {
  const { progress, isLoading } = useProgress();

  if (isLoading || !progress || progress.total === 0) {
    return null;
  }

  const percentage = Math.round((progress.completed / progress.total) * 100);

  const parts: string[] = [];
  if (progress.pending > 0) parts.push(`${progress.pending} pending`);
  if (progress.processing > 0) parts.push(`${progress.processing} processing`);
  if (progress.completed > 0) parts.push(`${progress.completed} completed`);
  if (progress.error > 0) parts.push(`${progress.error} errors`);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">
          Processing leads
        </span>
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {percentage}%
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {parts.join(', ')}
      </p>
    </div>
  );
}
