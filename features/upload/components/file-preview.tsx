import { FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreviewProps {
  file: File;
  error?: string | null;
  onClear: () => void;
  disabled?: boolean;
}

export function FilePreview({ file, error, onClear, disabled }: FilePreviewProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {file.name}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          disabled={disabled}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p className="text-sm whitespace-pre-line">{error}</p>
        </div>
      )}
    </div>
  );
}
