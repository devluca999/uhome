-- Helper function to get table column information
-- This allows the verification script to query schema even for empty tables

CREATE OR REPLACE FUNCTION public.get_table_columns(p_table_name TEXT)
RETURNS TABLE (column_name TEXT) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT column_name::TEXT
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = p_table_name
  ORDER BY ordinal_position;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.get_table_columns(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_table_columns(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_columns(TEXT) TO anon;

COMMENT ON FUNCTION public.get_table_columns(TEXT) IS 'Returns column names for a given table in the public schema. Used by verification scripts.';
