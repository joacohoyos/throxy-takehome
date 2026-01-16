-- Add unique constraint on lead identity (name, title, company)
ALTER TABLE leads
ADD CONSTRAINT unique_lead_identity
UNIQUE (lead_first_name, lead_last_name, lead_job_title, account_name);
