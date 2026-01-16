'use client';

import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useLeads } from '../hooks/use-leads';
import { LeadsTableSkeleton } from './leads-table-skeleton';
import { ScoreBadge } from './score-badge';
import { StatusBadge } from './status-badge';
import type { SortField } from '../stores/table-store';

function TruncatedCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`truncate ${className ?? ''}`} title={String(children)}>
      {children}
    </div>
  );
}

function SortIcon({
  field,
  currentSort,
  sortOrder,
}: {
  field: SortField;
  currentSort: SortField;
  sortOrder: 'asc' | 'desc';
}) {
  if (currentSort !== field) {
    return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-zinc-400" />;
  }
  return sortOrder === 'asc' ? (
    <ArrowUp className="ml-1 h-3.5 w-3.5" />
  ) : (
    <ArrowDown className="ml-1 h-3.5 w-3.5" />
  );
}

function SortableHeader({
  field,
  currentSort,
  sortOrder,
  onClick,
  children,
  className,
}: {
  field: SortField;
  currentSort: SortField;
  sortOrder: 'asc' | 'desc';
  onClick: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <button
        onClick={() => onClick(field)}
        className="inline-flex items-center hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {children}
        <SortIcon field={field} currentSort={currentSort} sortOrder={sortOrder} />
      </button>
    </TableHead>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
        <svg
          className="h-6 w-6 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </div>
      <h3 className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
        No leads yet
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Upload a CSV file to get started
      </p>
    </div>
  );
}

export function LeadsTable() {
  const { leads, isLoading, sortBy, sortOrder, setSorting } = useLeads();

  if (isLoading) {
    return <LeadsTableSkeleton />;
  }

  if (leads.length === 0) {
    return <EmptyState />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Name</TableHead>
          <TableHead className="w-[140px]">Job Title</TableHead>
          <SortableHeader
            field="account_name"
            currentSort={sortBy}
            sortOrder={sortOrder}
            onClick={setSorting}
            className="w-[130px]"
          >
            Company
          </SortableHeader>
          <TableHead className="w-[90px]">Size</TableHead>
          <TableHead className="w-[100px]">Industry</TableHead>
          <SortableHeader
            field="score"
            currentSort={sortBy}
            sortOrder={sortOrder}
            onClick={setSorting}
            className="w-[70px] text-center"
          >
            Score
          </SortableHeader>
          <TableHead className="w-[85px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => {
          const fullName = `${lead.lead_first_name} ${lead.lead_last_name}`;
          return (
            <TableRow key={lead.id}>
              <TableCell className="max-w-[120px]">
                <TruncatedCell className="font-medium">{fullName}</TruncatedCell>
              </TableCell>
              <TableCell className="max-w-[140px]">
                <TruncatedCell className="text-zinc-600 dark:text-zinc-400">
                  {lead.lead_job_title}
                </TruncatedCell>
              </TableCell>
              <TableCell className="max-w-[130px]">
                <TruncatedCell className="font-medium">{lead.account_name}</TruncatedCell>
                <TruncatedCell className="text-xs text-zinc-500">
                  {lead.account_domain}
                </TruncatedCell>
              </TableCell>
              <TableCell className="max-w-[90px]">
                <TruncatedCell className="text-zinc-600 dark:text-zinc-400">
                  {lead.account_employee_range}
                </TruncatedCell>
              </TableCell>
              <TableCell className="max-w-[100px]">
                <TruncatedCell className="text-zinc-600 dark:text-zinc-400">
                  {lead.account_industry || '-'}
                </TruncatedCell>
              </TableCell>
              <TableCell className="text-center">
                <ScoreBadge score={lead.score} />
              </TableCell>
              <TableCell>
                <StatusBadge status={lead.status} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
