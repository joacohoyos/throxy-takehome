import { useCallback, useState, useRef } from 'react';

interface UseFileDropOptions {
  accept?: string[];
  onFileSelect?: (file: File) => void;
}

export function useFileDrop({ accept, onFileSelect }: UseFileDropOptions = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isValidFile = useCallback(
    (file: File) => {
      if (!accept || accept.length === 0) return true;
      return accept.some(
        (type) => file.type === type || file.name.endsWith(type.replace('*', ''))
      );
    },
    [accept]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (isValidFile(file)) {
        setFile(file);
        onFileSelect?.(file);
      }
    },
    [isValidFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const openFilePicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  return {
    file,
    isDragging,
    inputRef,
    dropZoneProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
      onClick: openFilePicker,
    },
    inputProps: {
      ref: inputRef,
      type: 'file' as const,
      accept: accept?.join(','),
      onChange: handleInputChange,
      className: 'hidden',
    },
    openFilePicker,
    clearFile,
  };
}
