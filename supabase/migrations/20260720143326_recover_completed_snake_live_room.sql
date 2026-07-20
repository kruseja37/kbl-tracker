CREATE OR REPLACE FUNCTION public.kbl_snake_live_find_recoverable_room_by_code(p_room_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,pg_temp
AS $fn$
DECLARE
  u UUID:=auth.uid();
  r public.snake_live_rooms;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;

  SELECT * INTO r
  FROM public.snake_live_rooms
  WHERE owner_user_id=u
    AND room_code=p_room_code
    AND status IN ('open','complete')
  ORDER BY
    CASE status WHEN 'open' THEN 0 ELSE 1 END,
    updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN public.kbl_snake_live_room_json(r);
END;
$fn$;

REVOKE ALL ON FUNCTION public.kbl_snake_live_find_recoverable_room_by_code(TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_find_recoverable_room_by_code(TEXT)
TO authenticated;
