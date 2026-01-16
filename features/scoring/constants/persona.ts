export type CompanySize = 'startup' | 'smb' | 'mid_market' | 'enterprise';

export interface EmployeeRange {
  min: number;
  max: number | null;
  size: CompanySize;
  label: string;
}

export const EMPLOYEE_RANGES: EmployeeRange[] = [
  { min: 1, max: 50, size: 'startup', label: 'Startup (1-50)' },
  { min: 51, max: 200, size: 'smb', label: 'SMB (51-200)' },
  { min: 201, max: 1000, size: 'mid_market', label: 'Mid-Market (201-1000)' },
  { min: 1001, max: null, size: 'enterprise', label: 'Enterprise (1000+)' },
];

export interface TitlePriority {
  title: string;
  priority: number;
}

export const TITLE_PRIORITIES_BY_SIZE: Record<CompanySize, TitlePriority[]> = {
  startup: [
    { title: 'Founder', priority: 5 },
    { title: 'Co-Founder', priority: 5 },
    { title: 'CEO', priority: 5 },
    { title: 'President', priority: 5 },
    { title: 'Owner', priority: 5 },
    { title: 'Co-Owner', priority: 5 },
    { title: 'Managing Director', priority: 4 },
    { title: 'Head of Sales', priority: 4 },
  ],
  smb: [
    { title: 'VP of Sales', priority: 5 },
    { title: 'Head of Sales', priority: 5 },
    { title: 'Sales Director', priority: 5 },
    { title: 'Director of Sales Development', priority: 5 },
    { title: 'CRO', priority: 4 },
    { title: 'Chief Revenue Officer', priority: 4 },
    { title: 'Head of Revenue Operations', priority: 4 },
    { title: 'VP of Growth', priority: 4 },
  ],
  mid_market: [
    { title: 'VP of Sales Development', priority: 5 },
    { title: 'VP of Sales', priority: 5 },
    { title: 'Head of Sales Development', priority: 5 },
    { title: 'Director of Sales Development', priority: 5 },
    { title: 'CRO', priority: 4 },
    { title: 'Chief Revenue Officer', priority: 4 },
    { title: 'VP of Revenue Operations', priority: 4 },
    { title: 'VP of GTM', priority: 4 },
  ],
  enterprise: [
    { title: 'VP of Sales Development', priority: 5 },
    { title: 'VP of Inside Sales', priority: 5 },
    { title: 'Head of Sales Development', priority: 5 },
    { title: 'CRO', priority: 4 },
    { title: 'Chief Revenue Officer', priority: 4 },
    { title: 'VP of Revenue Operations', priority: 4 },
    { title: 'Director of Sales Development', priority: 4 },
    { title: 'VP of Field Sales', priority: 4 },
  ],
};

export const DEPARTMENT_PRIORITIES: TitlePriority[] = [
  { title: 'Sales Development', priority: 5 },
  { title: 'Sales', priority: 5 },
  { title: 'Revenue Operations', priority: 4 },
  { title: 'Business Development', priority: 4 },
  { title: 'GTM', priority: 4 },
  { title: 'Growth', priority: 4 },
];

export interface SeniorityRelevance {
  level: string;
  startup: number;
  smb: number;
  mid_market: number;
  enterprise: number;
}

export const SENIORITY_MATRIX: SeniorityRelevance[] = [
  { level: 'Founder / Owner', startup: 5, smb: 3, mid_market: 1, enterprise: 0 },
  { level: 'C-Level', startup: 5, smb: 3, mid_market: 2, enterprise: 1 },
  { level: 'Vice President', startup: 3, smb: 5, mid_market: 5, enterprise: 5 },
  { level: 'Director', startup: 2, smb: 4, mid_market: 5, enterprise: 4 },
  { level: 'Manager', startup: 1, smb: 2, mid_market: 3, enterprise: 3 },
  { level: 'Individual Contributor', startup: 0, smb: 0, mid_market: 1, enterprise: 1 },
];

export const HARD_EXCLUSIONS = [
  'CEO',
  'President',
  'CFO',
  'Chief Financial Officer',
  'CTO',
  'Chief Technology Officer',
  'VP of Engineering',
  'HR',
  'Human Resources',
  'Legal',
  'General Counsel',
  'Compliance',
  'Customer Success',
  'Product Manager',
  'Product Management',
];

export const SOFT_EXCLUSIONS = [
  'BDR',
  'SDR',
  'Business Development Representative',
  'Sales Development Representative',
  'Account Executive',
  'AE',
  'CMO',
  'Chief Marketing Officer',
  'VP of Marketing',
  'Board Member',
  'Advisor',
  'Consultant',
];

export const IDEAL_TARGET_VERTICALS = [
  'Manufacturing',
  'Education',
  'Healthcare',
  'EdTech',
  'HealthTech',
  'MedTech',
  'Industrial',
];

export const POSITIVE_SIGNALS = [
  'B2B SaaS',
  'Enterprise Sales',
  'Complex Sales Cycles',
  'Professional Services',
  'Technology Vendor',
];

export const NEGATIVE_SIGNALS = [
  'B2C',
  'Consumer',
  'Product-Led Growth',
  'PLG',
  'E-commerce',
  'Retail',
];
