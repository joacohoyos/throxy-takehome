import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropZoneProps {
  isDragging: boolean;
  dropZoneProps: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onClick: () => void;
  };
  title?: string;
  description?: string;
}

export function DropZone({
  isDragging,
  dropZoneProps,
  title = 'Drop your file here, or click to browse',
  description,
}: DropZoneProps) {
  return (
    <div
      {...dropZoneProps}
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
        isDragging
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          : 'border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600'
      )}
    >
      <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
        <Upload className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
