import type { Lead } from '@/server/domain/entities/lead';
import {
  TITLE_PRIORITIES_BY_SIZE,
  SENIORITY_MATRIX,
  HARD_EXCLUSIONS,
  SOFT_EXCLUSIONS,
  IDEAL_TARGET_VERTICALS,
  POSITIVE_SIGNALS,
  NEGATIVE_SIGNALS,
  type CompanySize,
} from '../constants/persona';

function getCompanySizeFromRange(employeeRange: string): CompanySize {
  const normalized = employeeRange.toLowerCase().replace(/[,\s]/g, '');

  if (normalized.includes('1-50') || normalized.includes('1-10') || normalized.includes('11-50')) {
    return 'startup';
  }
  if (normalized.includes('51-200') || normalized.includes('51-100') || normalized.includes('101-200')) {
    return 'smb';
  }
  if (normalized.includes('201-500') || normalized.includes('501-1000') || normalized.includes('201-1000')) {
    return 'mid_market';
  }
  if (normalized.includes('1001') || normalized.includes('1000+') || normalized.includes('5000') || normalized.includes('10000')) {
    return 'enterprise';
  }

  const match = normalized.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num <= 50) return 'startup';
    if (num <= 200) return 'smb';
    if (num <= 1000) return 'mid_market';
    return 'enterprise';
  }

  return 'smb';
}

export function buildScoringPrompt(lead: Lead): string {
  const companySize = getCompanySizeFromRange(lead.accountEmployeeRange);
  const titlePriorities = TITLE_PRIORITIES_BY_SIZE[companySize];

  const sizeLabel = {
    startup: 'Startup (1-50 employees)',
    smb: 'SMB (51-200 employees)',
    mid_market: 'Mid-Market (201-1000 employees)',
    enterprise: 'Enterprise (1000+ employees)',
  }[companySize];

  return `You are an expert B2B sales lead scoring system for Throxy, a company that helps B2B businesses with outbound sales.

## Your Task
Score the following lead on a scale of 0-10 based on how well they match Throxy's ideal customer profile.

## Lead Information
- **Name**: ${lead.leadFirstName} ${lead.leadLastName}
- **Job Title**: ${lead.leadJobTitle}
- **Company**: ${lead.accountName}
- **Domain**: ${lead.accountDomain}
- **Company Size**: ${lead.accountEmployeeRange} (categorized as: ${sizeLabel})
- **Industry**: ${lead.accountIndustry || 'Not specified'}

## Scoring Criteria

### Position/Job Title Fit (60% of score)

For ${sizeLabel} companies, these are the ideal job titles:
${titlePriorities.map((t) => `- ${t.title}: ${t.priority}/5 priority`).join('\n')}

Seniority relevance for ${sizeLabel}:
${SENIORITY_MATRIX.map((s) => `- ${s.level}: ${s[companySize]}/5`).join('\n')}

### Business Type Fit (40% of score)

**Ideal customers**: B2B companies that sell INTO complex verticals like manufacturing, education, and healthcare. These markets have long sales cycles, multiple stakeholders, and harder-to-reach buyers.

Target verticals (companies selling TO these industries): ${IDEAL_TARGET_VERTICALS.join(', ')}

Positive signals: ${POSITIVE_SIGNALS.join(', ')}

Negative signals: ${NEGATIVE_SIGNALS.join(', ')}

### Hard Exclusions (score 0-2)
If the lead matches any of these, score very low:
${HARD_EXCLUSIONS.join(', ')}

Note: CEO/President at Mid-Market and Enterprise companies are too far removed from outbound execution.

### Soft Exclusions (score 2-4)
These roles have limited fit:
${SOFT_EXCLUSIONS.join(', ')}

## Scoring Guidelines

- **9-10**: Perfect fit - exact title match for company size, sells into ideal verticals
- **7-8**: Strong fit - relevant title, good company profile
- **5-6**: Moderate fit - adjacent role or mixed signals
- **3-4**: Weak fit - soft exclusion or poor company fit
- **0-2**: Poor fit - hard exclusion or completely irrelevant

## Response Format

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{"score": <number between 0 and 10, can include one decimal place>}`;
}
