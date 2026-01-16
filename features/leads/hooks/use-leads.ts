'use client';

import { useQuery } from '@tanstack/react-query';
import type { LeadsResponse } from '@/types/api';
import { useTableStore } from '../stores/table-store';

async function fetchLeads(
  sortBy: string,
  sortOrder: string
): Promise<LeadsResponse> {
  const params = new URLSearchParams({ sortBy, sortOrder });
  const response = await fetch(`/api/leads?${params}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch leads');
  }

  return response.json();
}

export function useLeads() {
  const { sortBy, sortOrder, setSorting } = useTableStore();

  const query = useQuery({
    queryKey: ['leads', sortBy, sortOrder],
    queryFn: () => fetchLeads(sortBy, sortOrder),
  });

  return {
    leads: query.data?.leads ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    sortBy,
    sortOrder,
    setSorting,
  };
}
