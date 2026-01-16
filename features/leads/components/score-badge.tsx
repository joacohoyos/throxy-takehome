import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number | null;
  className?: string;
}

function getScoreColor(score: number | null): string {
  if (score === null) {
    return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400';
  }
  if (score <= 2) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }
  if (score <= 4) {
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  }
  if (score <= 6) {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  }
  if (score <= 8) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  }
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums',
        getScoreColor(score),
        className
      )}
    >
      {score !== null ? score.toFixed(1) : '-'}
    </span>
  );
}
