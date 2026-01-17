-- Remove cost column from ai_usage table (only tracking token consumption)
ALTER TABLE ai_usage DROP COLUMN cost;
