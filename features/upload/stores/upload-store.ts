import { create } from 'zustand';

interface UploadState {
  isUploading: boolean;
  error: string | null;
  setUploading: (isUploading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  isUploading: false,
  error: null,
  setUploading: (isUploading) => set({ isUploading }),
  setError: (error) => set({ error }),
  reset: () => set({ isUploading: false, error: null }),
}));
