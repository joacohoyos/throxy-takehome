import Papa from "papaparse";
import { csvRowSchema, type CsvParseResult, type CsvRow } from "@/types/csv";

const REQUIRED_COLUMNS = [
  "account_name",
  "lead_first_name",
  "lead_last_name",
  "account_domain",
  "account_employee_range",
];

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function validateHeaders(headers: string[]): string[] {
  const normalized = headers.map(normalizeHeader);
  return REQUIRED_COLUMNS.filter((col) => !normalized.includes(col));
}

function validateRows(data: unknown[]): { validRows: CsvRow[]; errors: string[] } {
  const validRows: CsvRow[] = [];
  const errors: string[] = [];

  data.forEach((row, index) => {
    const parsed = csvRowSchema.safeParse(row);
    if (parsed.success) {
      validRows.push(parsed.data);
    } else {
      const rowErrors = parsed.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      errors.push(`Row ${index + 2}: ${rowErrors}`);
    }
  });

  return { validRows, errors };
}

export function parseCSV(content: string): CsvParseResult {
  const results = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (results.errors.length > 0) {
    return {
      success: false,
      errors: results.errors.map((e) => `Row ${e.row}: ${e.message}`),
    };
  }

  const headers = results.meta.fields || [];
  const missingColumns = validateHeaders(headers);

  if (missingColumns.length > 0) {
    return {
      success: false,
      errors: [`Missing required columns: ${missingColumns.join(", ")}`],
    };
  }

  const { validRows, errors } = validateRows(results.data);

  if (validRows.length === 0) {
    return {
      success: false,
      errors: errors.length > 0 ? errors : ["No valid rows found in CSV"],
    };
  }

  return {
    success: true,
    data: validRows,
    errors: errors.length > 0 ? errors : undefined,
  };
}

export async function parseCSVFile(file: File): Promise<CsvParseResult> {
  const content = await file.text();
  return parseCSV(content);
}
