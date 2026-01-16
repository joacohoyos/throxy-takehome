import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { csvRowSchema, type CsvRow } from '@/types/csv';
import type { UploadResponse, ApiError } from '@/types/api';
import { SupabaseLeadRepository } from '@/server/infrastructure/repositories/supabase-lead.repository';
import { UploadLeadsCommand } from '@/server/application/commands/upload-leads.command';

const REQUIRED_COLUMNS = [
  'account_name',
  'lead_first_name',
  'lead_last_name',
  'account_domain',
  'account_employee_range',
];

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function validateHeaders(headers: string[]): string[] {
  const normalized = headers.map(normalizeHeader);
  return REQUIRED_COLUMNS.filter((col) => !normalized.includes(col));
}

function parseAndValidateCSV(content: string): { rows: CsvRow[]; errors: string[] } {
  const results = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (results.errors.length > 0) {
    return {
      rows: [],
      errors: results.errors.map((e) => `Row ${e.row}: ${e.message}`),
    };
  }

  const headers = results.meta.fields || [];
  const missingColumns = validateHeaders(headers);

  if (missingColumns.length > 0) {
    return {
      rows: [],
      errors: [`Missing required columns: ${missingColumns.join(', ')}`],
    };
  }

  const validRows: CsvRow[] = [];
  const errors: string[] = [];

  results.data.forEach((row, index) => {
    const parsed = csvRowSchema.safeParse(row);
    if (parsed.success) {
      validRows.push(parsed.data);
    } else {
      const rowErrors = parsed.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ');
      errors.push(`Row ${index + 2}: ${rowErrors}`);
    }
  });

  return { rows: validRows, errors };
}

export async function POST(request: Request): Promise<NextResponse<UploadResponse | ApiError>> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }

    const content = await file.text();
    const { rows, errors } = parseAndValidateCSV(content);

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid rows found in CSV',
          details: errors.length > 0 ? errors.slice(0, 10).join('; ') : undefined,
        },
        { status: 400 }
      );
    }

    const repository = new SupabaseLeadRepository();
    const command = new UploadLeadsCommand(repository);
    const result = await command.execute(rows);

    return NextResponse.json({
      success: true,
      count: result.count,
      leadIds: result.leadIds,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload leads',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
