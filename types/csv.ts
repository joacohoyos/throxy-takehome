import { z } from "zod";

export const csvRowSchema = z.object({
  account_name: z.string().min(1, "Account name is required"),
  lead_first_name: z.string().min(1, "First name is required"),
  lead_last_name: z.string().min(1, "Last name is required"),
  lead_job_title: z.string().nullish(),
  account_domain: z.string().min(1, "Domain is required"),
  account_employee_range: z.string().min(1, "Employee range is required"),
  account_industry: z.string().optional().nullable(),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

export interface CsvParseResult {
  success: boolean;
  data?: CsvRow[];
  errors?: string[];
}
