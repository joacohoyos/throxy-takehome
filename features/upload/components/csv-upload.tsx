'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useFileDrop } from '@/hooks/use-file-drop';
import { useUpload } from '../hooks/use-upload';
import { useUploadStore } from '../stores/upload-store';
import { DropZone } from './drop-zone';
import { FilePreview } from './file-preview';

export function CSVUpload() {
  const { upload, isUploading, reset: resetMutation } = useUpload();
  const { error, reset: resetStore } = useUploadStore();

  const handleFileSelect = useCallback(() => {
    resetStore();
    resetMutation();
  }, [resetStore, resetMutation]);

  const { file, isDragging, inputProps, dropZoneProps, clearFile } = useFileDrop({
    accept: ['.csv', 'text/csv'],
    onFileSelect: handleFileSelect,
  });

  const handleUpload = useCallback(() => {
    if (file) {
      upload(file);
    }
  }, [file, upload]);

  const handleClear = useCallback(() => {
    clearFile();
    resetStore();
    resetMutation();
  }, [clearFile, resetStore, resetMutation]);

  return (
    <div className="w-full">
      <input {...inputProps} />

      {!file ? (
        <DropZone
          isDragging={isDragging}
          dropZoneProps={dropZoneProps}
          title="Drop your CSV file here, or click to browse"
          description="CSV files with leads data"
        />
      ) : (
        <div className="space-y-4">
          <FilePreview
            file={file}
            error={error}
            onClear={handleClear}
            disabled={isUploading}
          />
          <div className="flex justify-end">
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Leads'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
