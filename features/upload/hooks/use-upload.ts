import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useUploadStore } from "../stores/upload-store";
import { parseCSVFile } from "../lib/csv-parser";
import { uploadLeadsAPI } from "../lib/api";

export function useUpload() {
  const { setUploading, setError, reset } = useUploadStore();

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const parseResult = await parseCSVFile(file);

      if (!parseResult.success || !parseResult.data) {
        throw new Error(
          parseResult.errors?.join("\n") || "Failed to parse CSV",
        );
      }

      return uploadLeadsAPI(file);
    },
    onMutate: () => {
      reset();
      setUploading(true);
    },
    onSuccess: (data) => {
      setUploading(false);
      toast.success(`Successfully uploaded ${data.count} leads`);
    },
    onError: (error: Error) => {
      setUploading(false);
      setError(error.message);
      toast.error("Upload failed", {
        description: error.message,
      });
    },
  });

  return {
    upload: mutation.mutate,
    uploadAsync: mutation.mutateAsync,
    isUploading: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}
