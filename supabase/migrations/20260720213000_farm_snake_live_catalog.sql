BEGIN;

-- The live-room tables already support FARM rooms. This validator now accepts
-- the FARM public catalog shape while keeping the MLB catalog contract intact.
CREATE OR REPLACE FUNCTION public.kbl_snake_live_catalog_payload_complete(p_value JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
DECLARE
  catalog_format TEXT;
  league_team_count INTEGER;
  distinct_count INTEGER;
  team_count INTEGER;
  item_count INTEGER;
  roster_team_count INTEGER;
  roster_entry RECORD;
BEGIN
  IF p_value IS NULL
    OR jsonb_typeof(p_value) <> 'object'
    OR jsonb_typeof(p_value->'league') <> 'object'
    OR jsonb_typeof(p_value#>'{league,teamIds}') <> 'array'
    OR jsonb_typeof(p_value->'teams') <> 'array'
    OR jsonb_array_length(p_value->'teams') = 0
    OR length(btrim(COALESCE(p_value#>>'{league,id}', ''))) = 0
  THEN
    RETURN FALSE;
  END IF;

  catalog_format := p_value->>'formatVersion';
  IF catalog_format NOT IN ('snake-live-catalog-v1', 'snake-live-farm-catalog-v1') THEN
    RETURN FALSE;
  END IF;

  IF EXISTS(
    SELECT 1
    FROM jsonb_array_elements(p_value#>'{league,teamIds}') entry
    WHERE jsonb_typeof(entry) <> 'string' OR length(btrim(entry#>>'{}')) = 0
  ) OR EXISTS(
    SELECT 1
    FROM jsonb_array_elements(p_value->'teams') entry
    WHERE jsonb_typeof(entry) <> 'object' OR length(btrim(COALESCE(entry->>'id', ''))) = 0
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT count(*), count(DISTINCT entry#>>'{}')
  INTO league_team_count, distinct_count
  FROM jsonb_array_elements(p_value#>'{league,teamIds}') entry;
  IF league_team_count = 0 OR league_team_count <> distinct_count THEN RETURN FALSE; END IF;

  SELECT count(*), count(DISTINCT entry->>'id')
  INTO team_count, distinct_count
  FROM jsonb_array_elements(p_value->'teams') entry;
  IF team_count <> distinct_count OR team_count <> league_team_count THEN RETURN FALSE; END IF;
  IF EXISTS(
    SELECT 1
    FROM jsonb_array_elements(p_value#>'{league,teamIds}') wanted
    WHERE NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(p_value->'teams') actual
      WHERE actual->>'id' = wanted#>>'{}'
    )
  ) THEN
    RETURN FALSE;
  END IF;

  IF catalog_format = 'snake-live-catalog-v1' THEN
    IF jsonb_typeof(p_value->'players') <> 'array'
      OR jsonb_typeof(p_value->'registeredPool') <> 'object'
      OR jsonb_typeof(p_value#>'{registeredPool,players}') <> 'array'
      OR jsonb_array_length(p_value->'players') = 0
      OR p_value#>>'{league,id}' <> p_value#>>'{registeredPool,leagueId}'
      OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(p_value->'players') entry
        WHERE jsonb_typeof(entry) <> 'object' OR length(btrim(COALESCE(entry->>'id', ''))) = 0
      )
      OR EXISTS(
        SELECT 1 FROM jsonb_array_elements(p_value#>'{registeredPool,players}') entry
        WHERE jsonb_typeof(entry) <> 'object' OR length(btrim(COALESCE(entry->>'id', ''))) = 0
      )
    THEN
      RETURN FALSE;
    END IF;

    SELECT count(*), count(DISTINCT entry->>'id')
    INTO item_count, distinct_count
    FROM jsonb_array_elements(p_value->'players') entry;
    IF item_count <> distinct_count THEN RETURN FALSE; END IF;
    SELECT count(*), count(DISTINCT entry->>'id')
    INTO team_count, distinct_count
    FROM jsonb_array_elements(p_value#>'{registeredPool,players}') entry;
    IF team_count <> distinct_count OR team_count <> item_count THEN RETURN FALSE; END IF;
    IF EXISTS(
      SELECT 1
      FROM jsonb_array_elements(p_value->'players') wanted
      WHERE NOT EXISTS(
        SELECT 1 FROM jsonb_array_elements(p_value#>'{registeredPool,players}') actual
        WHERE actual->>'id' = wanted->>'id'
      )
    ) THEN
      RETURN FALSE;
    END IF;
    RETURN TRUE;
  END IF;

  IF EXISTS(
      SELECT 1
      FROM jsonb_object_keys(p_value) AS root_key(key)
      WHERE root_key.key NOT IN (
        'formatVersion', 'league', 'teams', 'prospects', 'existingFarmRostersByTeamId', 'farmTarget'
      )
    )
    OR EXISTS(
      SELECT 1
      FROM jsonb_object_keys(p_value->'league') AS league_key(key)
      WHERE league_key.key NOT IN ('id', 'name', 'teamIds', 'tier')
    )
    OR length(btrim(COALESCE(p_value#>>'{league,name}', ''))) = 0
    OR (
      p_value#>'{league,tier}' IS NOT NULL
      AND jsonb_typeof(p_value#>'{league,tier}') <> 'string'
    )
    OR EXISTS(
      SELECT 1
      FROM jsonb_array_elements(p_value->'teams') entry
      WHERE jsonb_typeof(entry) <> 'object'
        OR EXISTS(
          SELECT 1
          FROM jsonb_object_keys(entry) AS team_key(key)
          WHERE team_key.key NOT IN (
            'id', 'name', 'abbreviation', 'colors', 'logoUrl', 'farmArchetypeKey'
          )
        )
        OR length(btrim(COALESCE(entry->>'name', ''))) = 0
        OR length(btrim(COALESCE(entry->>'abbreviation', ''))) = 0
        OR jsonb_typeof(entry->'colors') <> 'object'
        OR length(btrim(COALESCE(entry#>>'{colors,primary}', ''))) = 0
        OR length(btrim(COALESCE(entry#>>'{colors,secondary}', ''))) = 0
        OR length(btrim(COALESCE(entry->>'farmArchetypeKey', ''))) = 0
        OR EXISTS(
          SELECT 1
          FROM jsonb_object_keys(entry->'colors') AS color_key(key)
          WHERE color_key.key NOT IN ('primary', 'secondary', 'accent')
        )
        OR (entry->'logoUrl' IS NOT NULL AND jsonb_typeof(entry->'logoUrl') <> 'string')
        OR jsonb_typeof(entry->'farmArchetypeKey') <> 'string'
    )
    OR jsonb_typeof(p_value->'prospects') <> 'array'
    OR jsonb_array_length(p_value->'prospects') = 0
    OR jsonb_typeof(p_value->'existingFarmRostersByTeamId') <> 'object'
    OR jsonb_typeof(p_value->'farmTarget') <> 'number'
    OR (p_value->>'farmTarget')::NUMERIC <= 0
    OR trunc((p_value->>'farmTarget')::NUMERIC) <> (p_value->>'farmTarget')::NUMERIC
    OR EXISTS(
      SELECT 1
      FROM jsonb_array_elements(p_value->'prospects') entry
      WHERE jsonb_typeof(entry) <> 'object'
        OR length(btrim(COALESCE(entry->>'id', ''))) = 0
        OR length(btrim(COALESCE(entry->>'firstName', ''))) = 0
        OR length(btrim(COALESCE(entry->>'lastName', ''))) = 0
        OR length(btrim(COALESCE(entry->>'primaryPosition', ''))) = 0
        OR EXISTS(
          SELECT 1
          FROM jsonb_object_keys(entry) AS prospect_key(key)
          WHERE prospect_key.key NOT IN ('id', 'firstName', 'lastName', 'primaryPosition', 'secondaryPosition')
        )
    )
  THEN
    RETURN FALSE;
  END IF;

  SELECT count(*), count(DISTINCT entry->>'id')
  INTO item_count, distinct_count
  FROM jsonb_array_elements(p_value->'prospects') entry;
  IF item_count <> distinct_count THEN RETURN FALSE; END IF;

  SELECT count(*) INTO roster_team_count
  FROM jsonb_object_keys(p_value->'existingFarmRostersByTeamId');
  IF roster_team_count <> league_team_count THEN RETURN FALSE; END IF;
  IF EXISTS(
    SELECT 1
    FROM jsonb_array_elements(p_value#>'{league,teamIds}') wanted
    WHERE NOT (p_value->'existingFarmRostersByTeamId' ? (wanted#>>'{}'))
  ) THEN
    RETURN FALSE;
  END IF;

  FOR roster_entry IN
    SELECT key, value FROM jsonb_each(p_value->'existingFarmRostersByTeamId')
  LOOP
    IF jsonb_typeof(roster_entry.value) <> 'array'
      OR EXISTS(
        SELECT 1
        FROM jsonb_array_elements(roster_entry.value) player
        WHERE jsonb_typeof(player) <> 'object'
          OR length(btrim(COALESCE(player->>'id', ''))) = 0
          OR length(btrim(COALESCE(player->>'name', ''))) = 0
          OR length(btrim(COALESCE(player->>'position', ''))) = 0
          OR EXISTS(
            SELECT 1
            FROM jsonb_object_keys(player) AS player_key(key)
            WHERE player_key.key NOT IN ('id', 'name', 'position')
          )
      )
      OR (
        SELECT count(*) FROM jsonb_array_elements(roster_entry.value)
      ) <> (
        SELECT count(DISTINCT player->>'id') FROM jsonb_array_elements(roster_entry.value) player
      )
    THEN
      RETURN FALSE;
    END IF;
  END LOOP;
  RETURN TRUE;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_catalog_matches_active_pool(
  p_catalog JSONB,
  p_active_pool_ids JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
DECLARE
  expected_count INTEGER;
  expected_distinct INTEGER;
  catalog_count INTEGER;
  catalog_items JSONB;
BEGIN
  IF p_active_pool_ids IS NULL OR jsonb_typeof(p_active_pool_ids) <> 'array' THEN RETURN FALSE; END IF;
  IF EXISTS(
    SELECT 1 FROM jsonb_array_elements(p_active_pool_ids) entry
    WHERE jsonb_typeof(entry) <> 'string' OR length(btrim(entry#>>'{}')) = 0
  ) THEN
    RETURN FALSE;
  END IF;
  SELECT count(*), count(DISTINCT entry#>>'{}')
  INTO expected_count, expected_distinct
  FROM jsonb_array_elements(p_active_pool_ids) entry;
  IF expected_count = 0 OR expected_count <> expected_distinct THEN RETURN FALSE; END IF;

  catalog_items := CASE p_catalog->>'formatVersion'
    WHEN 'snake-live-catalog-v1' THEN p_catalog->'players'
    WHEN 'snake-live-farm-catalog-v1' THEN p_catalog->'prospects'
    ELSE NULL
  END;
  IF catalog_items IS NULL OR jsonb_typeof(catalog_items) <> 'array' THEN RETURN FALSE; END IF;
  SELECT count(*) INTO catalog_count FROM jsonb_array_elements(catalog_items);
  IF catalog_count <> expected_count THEN RETURN FALSE; END IF;
  IF EXISTS(
    SELECT 1
    FROM jsonb_array_elements(p_active_pool_ids) wanted
    WHERE NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(catalog_items) actual
      WHERE actual->>'id' = wanted#>>'{}'
    )
  ) THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$fn$;

-- FARM has no trade or pause action. Keep the existing MLB RPC surface but
-- reject those actions at the server when the room phase is FARM.
CREATE OR REPLACE FUNCTION public.kbl_snake_live_submit_intent(
  p_room_id UUID,
  p_device_id TEXT,
  p_device_token TEXT,
  p_team_id TEXT,
  p_idempotency_key TEXT,
  p_kind TEXT,
  p_expected_room_revision BIGINT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  r public.snake_live_rooms;
  i public.snake_live_intents;
  h BYTEA;
BEGIN
  SELECT * INTO r FROM public.snake_live_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF;
  PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id);
  IF r.status <> 'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
  IF NOT public.kbl_snake_live_device_matches(p_room_id, p_device_id, p_device_token)
    OR NOT EXISTS(
      SELECT 1 FROM public.snake_live_claims c
      WHERE c.room_id = p_room_id
        AND c.device_id = p_device_id
        AND c.team_id = p_team_id
        AND c.status = 'approved'
    )
  THEN
    RAISE EXCEPTION 'Forbidden: this device is not approved for that team.';
  END IF;
  IF p_kind NOT IN ('pick', 'trade')
    OR jsonb_typeof(p_payload) <> 'object'
    OR length(btrim(p_idempotency_key)) = 0
  THEN
    RAISE EXCEPTION 'The companion intent is invalid.';
  END IF;
  IF r.phase = 'FARM' AND p_kind <> 'pick' THEN
    RAISE EXCEPTION 'FARM trade intents are not allowed.';
  END IF;
  IF p_kind = 'pick' AND (
    length(btrim(COALESCE(p_payload->>'playerId', ''))) = 0
    OR jsonb_typeof(p_payload->'pick') <> 'number'
    OR COALESCE(p_payload->>'pick', '') !~ '^[1-9][0-9]*$'
    OR jsonb_typeof(p_payload->'sessionRevision') <> 'number'
    OR COALESCE(p_payload->>'sessionRevision', '') !~ '^(0|[1-9][0-9]*)$'
  ) THEN
    RAISE EXCEPTION 'The private pick intent is invalid.';
  END IF;
  IF p_kind = 'trade' AND (
    p_payload->>'action' NOT IN ('POST', 'NOD', 'WITHDRAW', 'DECLINE')
    OR length(btrim(COALESCE(p_payload->>'buyerTeamId', ''))) = 0
    OR length(btrim(COALESCE(p_payload->>'sellerTeamId', ''))) = 0
    OR p_payload->>'buyerTeamId' = p_payload->>'sellerTeamId'
    OR length(btrim(COALESCE(p_payload->>'offerId', ''))) = 0
    OR p_team_id NOT IN (p_payload->>'buyerTeamId', p_payload->>'sellerTeamId')
  ) THEN
    RAISE EXCEPTION 'The private trade intent is invalid.';
  END IF;
  h := public.kbl_snake_live_hash_json(jsonb_build_object(
    'device', p_device_id,
    'team', p_team_id,
    'kind', p_kind,
    'expected', p_expected_room_revision,
    'payload', p_payload
  ));
  SELECT * INTO i
  FROM public.snake_live_intents
  WHERE room_id = p_room_id AND idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF FOUND THEN
    IF i.request_hash <> h THEN RAISE EXCEPTION 'Idempotency conflict: the intent differs.'; END IF;
    RETURN public.kbl_snake_live_intent_json(i);
  END IF;
  IF r.public_revision <> p_expected_room_revision THEN
    RAISE EXCEPTION 'Stale expected revision for the room.';
  END IF;
  INSERT INTO public.snake_live_intents(
    room_id, idempotency_key, request_hash, device_id, team_id, kind,
    expected_room_revision, payload
  ) VALUES (
    p_room_id, p_idempotency_key, h, p_device_id, p_team_id, p_kind,
    p_expected_room_revision, p_payload
  ) RETURNING * INTO i;
  PERFORM public.kbl_snake_live_emit_event(
    p_room_id,
    r.public_revision,
    'intent:' || p_idempotency_key,
    h,
    'INTENT_ACTIVITY',
    jsonb_build_object(
      'teamId', p_team_id,
      'intentId', i.id,
      'intentRevision', i.intent_revision,
      'kind', p_kind,
      'action', 'submitted'
    )
  );
  RETURN public.kbl_snake_live_intent_json(i);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_submit_host_trade_intent(
  p_room_id UUID,
  p_host_device_id TEXT,
  p_host_token TEXT,
  p_team_id TEXT,
  p_idempotency_key TEXT,
  p_expected_room_revision BIGINT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  r public.snake_live_rooms;
  i public.snake_live_intents;
  h BYTEA;
BEGIN
  SELECT * INTO r FROM public.snake_live_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF;
  PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id);
  IF NOT public.kbl_snake_live_host_matches(r, p_host_device_id, p_host_token) THEN
    RAISE EXCEPTION 'Forbidden: the host token does not match.';
  END IF;
  IF r.status <> 'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
  IF r.phase = 'FARM' THEN RAISE EXCEPTION 'FARM trade intents are not allowed.'; END IF;
  IF jsonb_typeof(p_payload) <> 'object'
    OR length(btrim(p_idempotency_key)) = 0
    OR p_payload->>'action' NOT IN ('POST', 'NOD', 'WITHDRAW', 'DECLINE')
    OR length(btrim(COALESCE(p_payload->>'buyerTeamId', ''))) = 0
    OR length(btrim(COALESCE(p_payload->>'sellerTeamId', ''))) = 0
    OR p_payload->>'buyerTeamId' = p_payload->>'sellerTeamId'
    OR length(btrim(COALESCE(p_payload->>'offerId', ''))) = 0
    OR p_team_id NOT IN (p_payload->>'buyerTeamId', p_payload->>'sellerTeamId')
  THEN
    RAISE EXCEPTION 'The private host trade intent is invalid.';
  END IF;
  h := public.kbl_snake_live_hash_json(jsonb_build_object(
    'device', p_host_device_id,
    'team', p_team_id,
    'kind', 'trade',
    'expected', p_expected_room_revision,
    'payload', p_payload
  ));
  SELECT * INTO i
  FROM public.snake_live_intents
  WHERE room_id = p_room_id AND idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF FOUND THEN
    IF i.request_hash <> h THEN
      RAISE EXCEPTION 'Idempotency conflict: the host trade intent differs.';
    END IF;
    RETURN public.kbl_snake_live_intent_json(i);
  END IF;
  IF r.public_revision <> p_expected_room_revision THEN
    RAISE EXCEPTION 'Stale expected revision for the room.';
  END IF;
  INSERT INTO public.snake_live_intents(
    room_id, idempotency_key, request_hash, device_id, team_id, kind,
    expected_room_revision, payload
  ) VALUES (
    p_room_id, p_idempotency_key, h, p_host_device_id, p_team_id, 'trade',
    p_expected_room_revision, p_payload
  ) RETURNING * INTO i;
  PERFORM public.kbl_snake_live_emit_event(
    p_room_id,
    r.public_revision,
    'intent:' || p_idempotency_key,
    h,
    'INTENT_ACTIVITY',
    jsonb_build_object(
      'teamId', p_team_id,
      'intentId', i.id,
      'intentRevision', i.intent_revision,
      'kind', 'trade',
      'action', 'submitted'
    )
  );
  RETURN public.kbl_snake_live_intent_json(i);
END;
$fn$;

CREATE OR REPLACE FUNCTION public.kbl_snake_live_publish_room(
  p_room_id UUID,
  p_host_device_id TEXT,
  p_host_token TEXT,
  p_expected_room_revision BIGINT,
  p_idempotency_key TEXT,
  p_public_state JSONB,
  p_event_kind TEXT,
  p_public_event JSONB,
  p_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $fn$
DECLARE
  r public.snake_live_rooms;
  receipt public.snake_live_event_receipts;
  h BYTEA;
BEGIN
  SELECT * INTO r FROM public.snake_live_rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'The live room was not found.'; END IF;
  PERFORM public.kbl_snake_live_assert_owner(r.owner_user_id);
  IF NOT public.kbl_snake_live_host_matches(r, p_host_device_id, p_host_token) THEN
    RAISE EXCEPTION 'Forbidden: the host token does not match.';
  END IF;
  IF jsonb_typeof(p_public_state) <> 'object'
    OR jsonb_typeof(p_public_event) <> 'object'
    OR NOT public.kbl_snake_live_public_payload_safe(p_public_state)
    OR NOT public.kbl_snake_live_public_payload_safe(p_public_event)
  THEN
    RAISE EXCEPTION 'Public draft truth cannot contain private board data.';
  END IF;
  IF p_event_kind NOT IN ('PICK_RECORDED', 'TRADE_EXECUTED', 'PAUSE_CHANGED') THEN
    RAISE EXCEPTION 'The public draft event kind is invalid.';
  END IF;
  IF r.phase = 'FARM' AND p_event_kind <> 'PICK_RECORDED' THEN
    RAISE EXCEPTION 'FARM public actions can record picks only.';
  END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('open', 'complete', 'closed') THEN
    RAISE EXCEPTION 'The room status is invalid.';
  END IF;
  h := public.kbl_snake_live_hash_json(jsonb_build_object(
    'expected', p_expected_room_revision,
    'state', p_public_state,
    'kind', p_event_kind,
    'event', p_public_event,
    'status', p_status
  ));
  SELECT * INTO receipt
  FROM public.snake_live_event_receipts
  WHERE room_id = p_room_id AND event_key = p_idempotency_key
  FOR UPDATE;
  IF FOUND THEN
    IF receipt.request_hash <> h THEN
      RAISE EXCEPTION 'Idempotency conflict: the public operation differs.';
    END IF;
    RETURN public.kbl_snake_live_room_json(r);
  END IF;
  IF r.status <> 'open' THEN RAISE EXCEPTION 'The live room is not open.'; END IF;
  IF r.public_revision <> p_expected_room_revision THEN
    RAISE EXCEPTION 'Stale expected revision for the room.';
  END IF;
  IF p_event_kind IN ('PICK_RECORDED', 'TRADE_EXECUTED') THEN
    INSERT INTO public.snake_live_recovery_slots(
      room_id, prior_public_state, prior_status, source_room_revision, source_event_kind
    ) VALUES (
      p_room_id, r.public_state, r.status, r.public_revision + 1, p_event_kind
    )
    ON CONFLICT(room_id) DO UPDATE SET
      prior_public_state = EXCLUDED.prior_public_state,
      prior_status = EXCLUDED.prior_status,
      source_room_revision = EXCLUDED.source_room_revision,
      source_event_kind = EXCLUDED.source_event_kind,
      created_at = clock_timestamp();
  END IF;
  UPDATE public.snake_live_rooms
  SET public_revision = public_revision + 1,
      public_state = p_public_state,
      status = COALESCE(p_status, status),
      updated_at = clock_timestamp()
  WHERE id = p_room_id
  RETURNING * INTO r;
  PERFORM public.kbl_snake_live_emit_event(
    p_room_id,
    r.public_revision,
    p_idempotency_key,
    h,
    p_event_kind,
    p_public_event
  );
  RETURN public.kbl_snake_live_room_json(r);
END;
$fn$;

COMMIT;
