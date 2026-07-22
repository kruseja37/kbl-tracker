BEGIN;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_catalog_matches_phase(
  p_catalog JSONB,
  p_phase TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
  SELECT CASE p_phase
    WHEN 'MLB' THEN p_catalog->>'formatVersion' = 'snake-live-catalog-v1'
    WHEN 'FARM' THEN p_catalog->>'formatVersion' = 'snake-live-farm-catalog-v1'
    ELSE FALSE
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_seed_catalog(
  p_room_id UUID,
  p_host_device_id TEXT,
  p_host_token TEXT,
  p_catalog JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  r public.snake_live_rooms;
  c public.snake_live_catalogs;
  h BYTEA;
BEGIN
  SELECT * INTO r FROM public.snake_live_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF;
  PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id);
  IF NOT public.kbl_snake_live_host_matches(r, p_host_device_id, p_host_token) THEN
    RAISE EXCEPTION 'Forbidden: the host token does not match.';
  END IF;
  IF NOT public.kbl_snake_live_catalog_matches_phase(p_catalog, r.phase)
    OR NOT public.kbl_snake_live_catalog_payload_complete(p_catalog)
    OR NOT public.kbl_snake_live_catalog_matches_active_teams(
      p_catalog,
      r.public_state#>'{session,snakeSetup,clubs}'
    )
    OR NOT public.kbl_snake_live_catalog_matches_active_pool(
      p_catalog,
      r.public_state#>'{session,snakeSetup,poolPlayerIds}'
    )
    OR NOT public.kbl_snake_live_catalog_payload_safe(p_catalog)
  THEN
    RAISE EXCEPTION 'The live catalog is invalid or contains private data.';
  END IF;
  h := public.kbl_snake_live_hash_json(p_catalog);
  SELECT * INTO c FROM public.snake_live_catalogs WHERE room_id = p_room_id FOR UPDATE;
  IF FOUND THEN
    IF c.request_hash <> h THEN
      RAISE EXCEPTION 'Idempotency conflict: this room already has another catalog.';
    END IF;
    RETURN public.kbl_snake_live_catalog_json(c);
  END IF;
  IF r.status <> 'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
  INSERT INTO public.snake_live_catalogs(room_id, owner_user_id, catalog, request_hash)
  VALUES (p_room_id, r.owner_user_id, p_catalog, h)
  RETURNING * INTO c;
  RETURN public.kbl_snake_live_catalog_json(c);
END;
$fn$;

-- Explicit recovery for the signed-in league owner. This operation does not
-- change public draft truth. It rotates the lost Hotseat capability and repairs
-- only a missing or invalid phase catalog.
CREATE OR REPLACE FUNCTION public.kbl_snake_live_recover_host(
  p_room_id UUID,
  p_room_code TEXT,
  p_expected_room_revision BIGINT,
  p_new_host_device_id TEXT,
  p_new_host_token TEXT,
  p_catalog JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  r public.snake_live_rooms;
  c public.snake_live_catalogs;
  catalog_is_valid BOOLEAN := FALSE;
  new_catalog_hash BYTEA;
BEGIN
  SELECT * INTO r FROM public.snake_live_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF;
  PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id);
  IF r.room_code <> p_room_code OR p_room_code !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'The live room code does not match.';
  END IF;
  IF r.status NOT IN ('open', 'complete') THEN
    RAISE EXCEPTION 'The live room cannot be recovered.';
  END IF;
  IF r.public_revision <> p_expected_room_revision THEN
    RAISE EXCEPTION 'Stale expected revision for the room.';
  END IF;
  IF length(btrim(COALESCE(p_new_host_device_id, ''))) = 0 THEN
    RAISE EXCEPTION 'The new host device is invalid.';
  END IF;
  IF length(btrim(COALESCE(p_new_host_token, ''))) = 0 THEN
    RAISE EXCEPTION 'The new host token is invalid.';
  END IF;
  IF EXISTS(
    SELECT 1
    FROM public.snake_live_claims claim
    WHERE claim.room_id = r.id
      AND claim.device_id = p_new_host_device_id
      AND claim.status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'A companion device cannot become the Hotseat host.';
  END IF;
  IF NOT public.kbl_snake_live_catalog_matches_phase(p_catalog, r.phase)
    OR NOT public.kbl_snake_live_catalog_payload_complete(p_catalog)
    OR NOT public.kbl_snake_live_catalog_matches_active_teams(
      p_catalog,
      r.public_state#>'{session,snakeSetup,clubs}'
    )
    OR NOT public.kbl_snake_live_catalog_matches_active_pool(
      p_catalog,
      r.public_state#>'{session,snakeSetup,poolPlayerIds}'
    )
    OR NOT public.kbl_snake_live_catalog_payload_safe(p_catalog)
  THEN
    RAISE EXCEPTION 'The recovery catalog is invalid or contains private data.';
  END IF;

  SELECT * INTO c FROM public.snake_live_catalogs WHERE room_id = r.id FOR UPDATE;
  IF FOUND THEN
    catalog_is_valid := public.kbl_snake_live_catalog_matches_phase(c.catalog, r.phase)
      AND public.kbl_snake_live_catalog_payload_complete(c.catalog)
      AND public.kbl_snake_live_catalog_matches_active_teams(
        c.catalog,
        r.public_state#>'{session,snakeSetup,clubs}'
      )
      AND public.kbl_snake_live_catalog_matches_active_pool(
        c.catalog,
        r.public_state#>'{session,snakeSetup,poolPlayerIds}'
      )
      AND public.kbl_snake_live_catalog_payload_safe(c.catalog);
  END IF;

  IF NOT catalog_is_valid THEN
    new_catalog_hash := public.kbl_snake_live_hash_json(p_catalog);
    INSERT INTO public.snake_live_catalogs(
      room_id, owner_user_id, catalog, request_hash, created_at
    ) VALUES (
      r.id, r.owner_user_id, p_catalog, new_catalog_hash, clock_timestamp()
    )
    ON CONFLICT(room_id) DO UPDATE SET
      owner_user_id = EXCLUDED.owner_user_id,
      catalog_revision = 1,
      catalog = EXCLUDED.catalog,
      request_hash = EXCLUDED.request_hash,
      created_at = EXCLUDED.created_at;
  END IF;

  UPDATE public.snake_live_devices
  SET status = 'revoked', last_seen_at = clock_timestamp()
  WHERE room_id = r.id
    AND device_id = r.host_device_id
    AND device_id <> p_new_host_device_id;

  INSERT INTO public.snake_live_devices(room_id, device_id, token_hash, status, last_seen_at)
  VALUES (
    r.id,
    p_new_host_device_id,
    public.kbl_snake_live_hash_token(p_new_host_token),
    'active',
    clock_timestamp()
  )
  ON CONFLICT(room_id, device_id) DO UPDATE SET
    token_hash = EXCLUDED.token_hash,
    status = 'active',
    last_seen_at = EXCLUDED.last_seen_at;

  UPDATE public.snake_live_rooms
  SET host_device_id = p_new_host_device_id,
      host_token_hash = public.kbl_snake_live_hash_token(p_new_host_token),
      updated_at = clock_timestamp()
  WHERE id = r.id
  RETURNING * INTO r;

  RETURN public.kbl_snake_live_room_json(r);
END;
$fn$;

REVOKE ALL ON FUNCTION public.kbl_snake_live_catalog_matches_phase(JSONB, TEXT)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.kbl_snake_live_recover_host(UUID, TEXT, BIGINT, TEXT, TEXT, JSONB)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kbl_snake_live_recover_host(UUID, TEXT, BIGINT, TEXT, TEXT, JSONB)
TO authenticated;

COMMIT;
