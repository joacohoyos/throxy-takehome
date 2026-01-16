"use client";

import { useQuery } from "@tanstack/react-query";
import type { ProgressResponse } from "@/types/api";

async function fetchProgress(): Promise<ProgressResponse> {
  const response = await fetch("/api/leads/progress");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch progress");
  }

  return response.json();
}

export function useProgress() {
  const query = useQuery({
    queryKey: ["progress"],
    queryFn: fetchProgress,
    // refetchInterval: (query) => {
    //   const data = query.state.data;
    //   if (!data) return false;
    //
    //   const hasActiveWork = data.pending > 0 || data.processing > 0;
    //   return hasActiveWork ? 2000 : false;
    // },
  });

  return {
    progress: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
