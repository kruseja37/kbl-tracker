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
    OR jsonb_typeof(p_value->'formatVersion') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_value->'league') <> 'object'
    OR jsonb_typeof(p_value#>'{league,id}') IS DISTINCT FROM 'string'
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
    WHERE jsonb_typeof(entry) <> 'object'
      OR jsonb_typeof(entry->'id') IS DISTINCT FROM 'string'
      OR length(btrim(COALESCE(entry->>'id', ''))) = 0
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
    OR jsonb_typeof(p_value#>'{league,name}') IS DISTINCT FROM 'string'
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
        OR jsonb_typeof(entry->'id') IS DISTINCT FROM 'string'
        OR jsonb_typeof(entry->'name') IS DISTINCT FROM 'string'
        OR jsonb_typeof(entry->'abbreviation') IS DISTINCT FROM 'string'
        OR length(btrim(COALESCE(entry->>'name', ''))) = 0
        OR length(btrim(COALESCE(entry->>'abbreviation', ''))) = 0
        OR jsonb_typeof(entry->'colors') <> 'object'
        OR jsonb_typeof(entry#>'{colors,primary}') IS DISTINCT FROM 'string'
        OR jsonb_typeof(entry#>'{colors,secondary}') IS DISTINCT FROM 'string'
        OR length(btrim(COALESCE(entry#>>'{colors,primary}', ''))) = 0
        OR length(btrim(COALESCE(entry#>>'{colors,secondary}', ''))) = 0
        OR length(btrim(COALESCE(entry->>'farmArchetypeKey', ''))) = 0
        OR EXISTS(
          SELECT 1
          FROM jsonb_object_keys(entry->'colors') AS color_key(key)
          WHERE color_key.key NOT IN ('primary', 'secondary', 'accent')
        )
        OR (
          entry#>'{colors,accent}' IS NOT NULL
          AND jsonb_typeof(entry#>'{colors,accent}') <> 'string'
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
        OR jsonb_typeof(entry->'id') IS DISTINCT FROM 'string'
        OR jsonb_typeof(entry->'firstName') IS DISTINCT FROM 'string'
        OR jsonb_typeof(entry->'lastName') IS DISTINCT FROM 'string'
        OR jsonb_typeof(entry->'primaryPosition') IS DISTINCT FROM 'string'
        OR length(btrim(COALESCE(entry->>'id', ''))) = 0
        OR length(btrim(COALESCE(entry->>'firstName', ''))) = 0
        OR length(btrim(COALESCE(entry->>'lastName', ''))) = 0
        OR length(btrim(COALESCE(entry->>'primaryPosition', ''))) = 0
        OR EXISTS(
          SELECT 1
          FROM jsonb_object_keys(entry) AS prospect_key(key)
          WHERE prospect_key.key NOT IN ('id', 'firstName', 'lastName', 'primaryPosition', 'secondaryPosition')
        )
        OR (
          entry ? 'secondaryPosition'
          AND jsonb_typeof(entry->'secondaryPosition') NOT IN ('string', 'null')
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
          OR jsonb_typeof(player->'id') IS DISTINCT FROM 'string'
          OR jsonb_typeof(player->'name') IS DISTINCT FROM 'string'
          OR jsonb_typeof(player->'position') IS DISTINCT FROM 'string'
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

-- A FARM publish is one exact pick transition. The host can advance public
-- truth, but it cannot use a pick event to rewrite order, trades, pause, or
-- any other saved session field.
CREATE OR REPLACE FUNCTION public.kbl_snake_live_farm_pick_transition_valid(
  p_previous JSONB,
  p_next JSONB,
  p_event JSONB,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $fn$
DECLARE
  previous_session JSONB;
  next_session JSONB;
  previous_picks JSONB;
  next_picks JSONB;
  pick_order JSONB;
  expected_slot JSONB;
  new_pick JSONB;
  previous_static JSONB;
  next_static JSONB;
  previous_index INTEGER;
  next_index INTEGER;
  previous_revision INTEGER;
  next_revision INTEGER;
  previous_count INTEGER;
  next_count INTEGER;
  event_pick INTEGER;
  event_team_id TEXT;
  event_player_id TEXT;
  expected_status TEXT;
BEGIN
  IF p_previous IS NULL
    OR p_next IS NULL
    OR p_event IS NULL
    OR jsonb_typeof(p_previous) <> 'object'
    OR jsonb_typeof(p_next) <> 'object'
    OR jsonb_typeof(p_event) <> 'object'
    OR jsonb_typeof(p_previous->'formatVersion') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_next->'formatVersion') IS DISTINCT FROM 'string'
    OR p_previous->>'formatVersion' <> 'snake-live-public-state-v1'
    OR p_next->>'formatVersion' <> 'snake-live-public-state-v1'
    OR jsonb_typeof(p_previous->'session') IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_next->'session') IS DISTINCT FROM 'object'
    OR EXISTS(
      SELECT 1 FROM jsonb_object_keys(p_previous) root_key(key)
      WHERE root_key.key NOT IN ('formatVersion', 'session')
    )
    OR EXISTS(
      SELECT 1 FROM jsonb_object_keys(p_next) root_key(key)
      WHERE root_key.key NOT IN ('formatVersion', 'session')
    )
    OR EXISTS(
      SELECT 1 FROM jsonb_object_keys(p_event) event_key(key)
      WHERE event_key.key NOT IN ('pick', 'teamId', 'playerId')
    )
    OR jsonb_typeof(p_event->'pick') IS DISTINCT FROM 'number'
    OR jsonb_typeof(p_event->'teamId') IS DISTINCT FROM 'string'
    OR jsonb_typeof(p_event->'playerId') IS DISTINCT FROM 'string'
    OR length(btrim(COALESCE(p_event->>'teamId', ''))) = 0
    OR length(btrim(COALESCE(p_event->>'playerId', ''))) = 0
  THEN
    RETURN FALSE;
  END IF;

  previous_session := p_previous->'session';
  next_session := p_next->'session';
  IF jsonb_typeof(previous_session->'draftPhase') IS DISTINCT FROM 'string'
    OR jsonb_typeof(next_session->'draftPhase') IS DISTINCT FROM 'string'
    OR previous_session->>'draftPhase' <> 'FARM'
    OR next_session->>'draftPhase' <> 'FARM'
    OR jsonb_typeof(previous_session->'completedPicks') IS DISTINCT FROM 'array'
    OR jsonb_typeof(next_session->'completedPicks') IS DISTINCT FROM 'array'
    OR jsonb_typeof(previous_session->'pickOrder') IS DISTINCT FROM 'array'
    OR jsonb_typeof(next_session->'pickOrder') IS DISTINCT FROM 'array'
    OR jsonb_typeof(previous_session->'farmSlotSalaries') IS DISTINCT FROM 'array'
    OR jsonb_typeof(next_session->'farmSlotSalaries') IS DISTINCT FROM 'array'
    OR jsonb_typeof(previous_session->'currentPickIndex') IS DISTINCT FROM 'number'
    OR jsonb_typeof(next_session->'currentPickIndex') IS DISTINCT FROM 'number'
    OR jsonb_typeof(previous_session->'revision') IS DISTINCT FROM 'number'
    OR jsonb_typeof(next_session->'revision') IS DISTINCT FROM 'number'
    OR jsonb_typeof(previous_session->'lastModified') IS DISTINCT FROM 'string'
    OR jsonb_typeof(next_session->'lastModified') IS DISTINCT FROM 'string'
    OR (previous_session ? 'paused' AND previous_session->'paused' <> 'false'::JSONB)
    OR (next_session ? 'paused' AND next_session->'paused' <> 'false'::JSONB)
  THEN
    RETURN FALSE;
  END IF;

  IF length(previous_session->>'currentPickIndex') > 9
    OR length(next_session->>'currentPickIndex') > 9
    OR length(previous_session->>'revision') > 9
    OR length(next_session->>'revision') > 9
    OR length(p_event->>'pick') > 9
    OR (previous_session->>'currentPickIndex') !~ '^[0-9]+$'
    OR (next_session->>'currentPickIndex') !~ '^[0-9]+$'
    OR (previous_session->>'revision') !~ '^[0-9]+$'
    OR (next_session->>'revision') !~ '^[0-9]+$'
    OR (p_event->>'pick') !~ '^[1-9][0-9]*$'
  THEN
    RETURN FALSE;
  END IF;

  previous_index := (previous_session->>'currentPickIndex')::INTEGER;
  next_index := (next_session->>'currentPickIndex')::INTEGER;
  previous_revision := (previous_session->>'revision')::INTEGER;
  next_revision := (next_session->>'revision')::INTEGER;
  event_pick := (p_event->>'pick')::INTEGER;
  event_team_id := p_event->>'teamId';
  event_player_id := p_event->>'playerId';
  previous_picks := previous_session->'completedPicks';
  next_picks := next_session->'completedPicks';
  pick_order := previous_session->'pickOrder';
  previous_static := (((previous_session - 'completedPicks') - 'currentPickIndex') - 'revision') - 'lastModified';
  next_static := (((next_session - 'completedPicks') - 'currentPickIndex') - 'revision') - 'lastModified';
  previous_count := jsonb_array_length(previous_picks);
  next_count := jsonb_array_length(next_picks);

  IF previous_index <> previous_count
    OR next_index <> previous_index + 1
    OR next_count <> previous_count + 1
    OR next_index <> next_count
    OR next_revision <> previous_revision + 1
    OR previous_index >= jsonb_array_length(pick_order)
    OR jsonb_array_length(next_session->'pickOrder') <> jsonb_array_length(pick_order)
    OR next_static IS DISTINCT FROM previous_static
    OR (next_picks - (next_count - 1)) IS DISTINCT FROM previous_picks
  THEN
    RETURN FALSE;
  END IF;

  expected_slot := pick_order->previous_index;
  new_pick := next_picks->(next_count - 1);
  IF jsonb_typeof(expected_slot) IS DISTINCT FROM 'object'
    OR jsonb_typeof(new_pick) IS DISTINCT FROM 'object'
    OR EXISTS(
      SELECT 1 FROM jsonb_object_keys(new_pick) pick_key(key)
      WHERE pick_key.key NOT IN ('round', 'pick', 'teamId', 'playerId', 'settledSalary', 'marginalTax')
    )
    OR jsonb_typeof(expected_slot->'round') IS DISTINCT FROM 'number'
    OR jsonb_typeof(expected_slot->'pick') IS DISTINCT FROM 'number'
    OR jsonb_typeof(expected_slot->'teamId') IS DISTINCT FROM 'string'
    OR jsonb_typeof(new_pick->'round') IS DISTINCT FROM 'number'
    OR jsonb_typeof(new_pick->'pick') IS DISTINCT FROM 'number'
    OR jsonb_typeof(new_pick->'teamId') IS DISTINCT FROM 'string'
    OR jsonb_typeof(new_pick->'playerId') IS DISTINCT FROM 'string'
    OR jsonb_typeof(new_pick->'settledSalary') IS DISTINCT FROM 'number'
    OR jsonb_typeof(new_pick->'marginalTax') IS DISTINCT FROM 'number'
    OR new_pick->'round' IS DISTINCT FROM expected_slot->'round'
    OR new_pick->'pick' IS DISTINCT FROM expected_slot->'pick'
    OR new_pick->'teamId' IS DISTINCT FROM expected_slot->'teamId'
    OR new_pick->>'playerId' <> event_player_id
    OR new_pick->'pick' IS DISTINCT FROM p_event->'pick'
    OR new_pick->>'teamId' <> event_team_id
    OR event_pick <> (expected_slot->>'pick')::INTEGER
    OR jsonb_array_length(next_session->'farmSlotSalaries') <= previous_index
    OR new_pick->'settledSalary' IS DISTINCT FROM next_session->'farmSlotSalaries'->previous_index
    OR (new_pick->>'marginalTax')::NUMERIC <> 0
    OR jsonb_typeof(next_session#>'{snakeSetup,poolPlayerIds}') IS DISTINCT FROM 'array'
    OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(next_session#>'{snakeSetup,poolPlayerIds}') pool_id
      WHERE jsonb_typeof(pool_id) <> 'string'
    )
    OR NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements_text(next_session#>'{snakeSetup,poolPlayerIds}') pool_id
      WHERE pool_id = event_player_id
    )
    OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(previous_picks) prior_pick
      WHERE prior_pick->>'playerId' = event_player_id
    )
  THEN
    RETURN FALSE;
  END IF;

  expected_status := CASE
    WHEN next_index = jsonb_array_length(pick_order) THEN 'complete'
    ELSE 'open'
  END;
  RETURN p_status = expected_status;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
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
  IF r.phase = 'FARM' AND NOT public.kbl_snake_live_farm_pick_transition_valid(
    r.public_state,
    p_public_state,
    p_public_event,
    p_status
  ) THEN
    RAISE EXCEPTION 'The FARM pick transition is invalid.';
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
