-- Close Expired Requirements
-- Automatically closes requirements past their closes_at date.
-- Run this script in the Supabase SQL Editor to create the function.

CREATE OR REPLACE FUNCTION close_expired_requirements()
RETURNS integer AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.requirements
  SET status = 'closed'
  WHERE status IN ('open', 'partially_filled')
    AND closes_at < now();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule with pg_cron (requires the pg_cron extension enabled in Supabase dashboard):
-- 1. Go to Database > Extensions and enable pg_cron
-- 2. Run the following in the SQL Editor:
--
-- SELECT cron.schedule('close-expired-requirements', '0 * * * *',
--   $$SELECT close_expired_requirements()$$);
--
-- To verify the job:
--   SELECT * FROM cron.job;
--
-- To remove the job:
--   SELECT cron.unschedule('close-expired-requirements');
