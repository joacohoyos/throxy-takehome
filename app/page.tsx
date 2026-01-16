import { CSVUpload } from '@/features/upload/components/csv-upload';
import { LeadsTable } from '@/features/leads/components/leads-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Lead Scoring
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Upload CSV files with leads to score them using AI
          </p>
        </header>

        <main className="space-y-8">
          <section>
            <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Upload Leads
            </h2>
            <CSVUpload />
          </section>

          <section>
            <Card>
              <CardHeader>
                <CardTitle>Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <LeadsTable />
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
