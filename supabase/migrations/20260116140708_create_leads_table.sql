-- Create leads table for storing uploaded CSV lead data
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_name TEXT NOT NULL,
  lead_first_name TEXT NOT NULL,
  lead_last_name TEXT NOT NULL,
  lead_job_title TEXT NOT NULL,
  account_domain TEXT NOT NULL,
  account_employee_range TEXT NOT NULL,
  account_industry TEXT,
  score NUMERIC(3, 1),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 10))
);

-- Indexes for common query patterns
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_score_desc ON leads(score DESC NULLS LAST);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
