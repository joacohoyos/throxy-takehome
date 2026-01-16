-- Enable Row Level Security on tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Permissive policies allowing all operations (no auth required for this app)
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true);
CREATE POLICY "Allow all on ai_usage" ON ai_usage FOR ALL USING (true);
