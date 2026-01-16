import { create } from 'zustand';

export type SortField = 'score' | 'created_at' | 'account_name';
export type SortOrder = 'asc' | 'desc';

interface TableState {
  sortBy: SortField;
  sortOrder: SortOrder;
  setSorting: (field: SortField) => void;
}

export const useTableStore = create<TableState>((set) => ({
  sortBy: 'score',
  sortOrder: 'desc',
  setSorting: (field) =>
    set((state) => ({
      sortBy: field,
      sortOrder:
        state.sortBy === field
          ? state.sortOrder === 'asc'
            ? 'desc'
            : 'asc'
          : 'desc',
    })),
}));
