import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function SkeletonCell({ className }: { className?: string }) {
  return (
    <div
      className={`h-4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700 ${className ?? ''}`}
    />
  );
}

export function LeadsTableSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[120px]">Name</TableHead>
          <TableHead className="w-[140px]">Job Title</TableHead>
          <TableHead className="w-[130px]">Company</TableHead>
          <TableHead className="w-[90px]">Size</TableHead>
          <TableHead className="w-[100px]">Industry</TableHead>
          <TableHead className="w-[70px] text-center">Score</TableHead>
          <TableHead className="w-[85px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <SkeletonCell className="w-20" />
            </TableCell>
            <TableCell>
              <SkeletonCell className="w-28" />
            </TableCell>
            <TableCell>
              <SkeletonCell className="w-24" />
            </TableCell>
            <TableCell>
              <SkeletonCell className="w-16" />
            </TableCell>
            <TableCell>
              <SkeletonCell className="w-20" />
            </TableCell>
            <TableCell>
              <div className="flex justify-center">
                <SkeletonCell className="w-8" />
              </div>
            </TableCell>
            <TableCell>
              <SkeletonCell className="w-14" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
