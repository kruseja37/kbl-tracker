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

  IF jsonb_typeof(p_value->'prospects') <> 'array'
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

COMMIT;
