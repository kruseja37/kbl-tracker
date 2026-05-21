-- KBL Tracker duplicate sync op payload hardening
--
-- Migration 005 made duplicate op_id handling verify the original target. This
-- also records deleted state and a server-side JSONB payload fingerprint so a
-- corrupted durable queue cannot clear a same-op/same-target write with
-- different content as "duplicate".

ALTER TABLE kbl_sync_applied_ops
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN,
  ADD COLUMN IF NOT EXISTS payload_fingerprint TEXT;

DO $kbl_duplicate_op_payload_rpc$
BEGIN
  EXECUTE $kbl_store_fn$
CREATE OR REPLACE FUNCTION public.kbl_atomic_upsert_store_rows(p_rows JSONB)
RETURNS TABLE(row_index INTEGER, status TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $kbl_atomic_upsert_store_rows$
DECLARE
  v_row JSONB;
  v_user_id UUID;
  v_op_id TEXT;
  v_db_name TEXT;
  v_store_name TEXT;
  v_record_key TEXT;
  v_target_key TEXT;
  v_changed_at BIGINT;
  v_deleted BOOLEAN;
  v_payload_fingerprint TEXT;
  v_base_received_at TIMESTAMPTZ;
  v_base_id UUID;
  v_applied INTEGER;
  v_existing_op RECORD;
  v_index INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb))
  LOOP
    row_index := v_index;
    v_user_id := (v_row->>'user_id')::uuid;
    v_op_id := NULLIF(v_row->>'op_id', '');
    v_db_name := v_row->>'db_name';
    v_store_name := v_row->>'store_name';
    v_record_key := v_row->>'record_key';
    v_target_key := v_db_name || '|' || v_store_name || '|' || v_record_key;
    v_changed_at := (v_row->>'changed_at')::bigint;
    v_deleted := COALESCE((v_row->>'deleted')::boolean, false);
    v_payload_fingerprint := md5(COALESCE(v_row->'data', '{}'::jsonb)::text);
    v_base_received_at := NULLIF(v_row->>'base_received_at', '')::timestamptz;
    v_base_id := NULLIF(v_row->>'base_id', '')::uuid;

    IF auth.uid() IS NULL OR v_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'kbl_atomic_upsert_store_rows user mismatch';
    END IF;

    IF v_op_id IS NOT NULL THEN
      SELECT target_table, target_key, changed_at, deleted, payload_fingerprint
      INTO v_existing_op
      FROM kbl_sync_applied_ops
      WHERE user_id = v_user_id AND op_id = v_op_id;

      IF FOUND THEN
        IF
          v_existing_op.target_table = 'kbl_stores' AND
          v_existing_op.target_key = v_target_key AND
          v_existing_op.changed_at = v_changed_at AND
          v_existing_op.deleted IS NOT DISTINCT FROM v_deleted AND
          v_existing_op.payload_fingerprint IS NOT DISTINCT FROM v_payload_fingerprint
        THEN
          status := 'duplicate';
        ELSE
          status := 'skipped';
        END IF;
        RETURN NEXT;
        v_index := v_index + 1;
        CONTINUE;
      END IF;
    END IF;

    WITH upserted AS (
      INSERT INTO kbl_stores (
        user_id,
        db_name,
        store_name,
        record_key,
        data,
        changed_at,
        deleted,
        received_at
      )
      VALUES (
        v_user_id,
        v_db_name,
        v_store_name,
        v_record_key,
        COALESCE(v_row->'data', '{}'::jsonb),
        v_changed_at,
        v_deleted,
        now()
      )
      ON CONFLICT (user_id, db_name, store_name, record_key)
      DO UPDATE SET
        data = EXCLUDED.data,
        changed_at = EXCLUDED.changed_at,
        deleted = EXCLUDED.deleted,
        received_at = now()
      WHERE EXCLUDED.changed_at > kbl_stores.changed_at
        AND v_base_received_at IS NOT NULL
        AND (
          kbl_stores.received_at < v_base_received_at OR
          (
            kbl_stores.received_at = v_base_received_at AND
            v_base_id IS NOT NULL AND
            kbl_stores.id <= v_base_id
          )
        )
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_applied FROM upserted;

    IF v_applied > 0 THEN
      status := 'accepted';
      IF v_op_id IS NOT NULL THEN
        INSERT INTO kbl_sync_applied_ops (
          user_id,
          op_id,
          target_table,
          target_key,
          changed_at,
          deleted,
          payload_fingerprint
        )
        VALUES (
          v_user_id,
          v_op_id,
          'kbl_stores',
          v_target_key,
          v_changed_at,
          v_deleted,
          v_payload_fingerprint
        )
        ON CONFLICT (user_id, op_id) DO NOTHING;
      END IF;
    ELSE
      status := 'skipped';
    END IF;

    RETURN NEXT;
    v_index := v_index + 1;
  END LOOP;
END;
$kbl_atomic_upsert_store_rows$;
$kbl_store_fn$;

  EXECUTE $kbl_local_storage_fn$
CREATE OR REPLACE FUNCTION public.kbl_atomic_upsert_local_storage_rows(p_rows JSONB)
RETURNS TABLE(row_index INTEGER, status TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $kbl_atomic_upsert_local_storage_rows$
DECLARE
  v_row JSONB;
  v_user_id UUID;
  v_op_id TEXT;
  v_key TEXT;
  v_changed_at BIGINT;
  v_deleted BOOLEAN;
  v_payload_fingerprint TEXT;
  v_base_received_at TIMESTAMPTZ;
  v_base_key TEXT;
  v_applied INTEGER;
  v_existing_op RECORD;
  v_index INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_rows, '[]'::jsonb))
  LOOP
    row_index := v_index;
    v_user_id := (v_row->>'user_id')::uuid;
    v_op_id := NULLIF(v_row->>'op_id', '');
    v_key := v_row->>'key';
    v_changed_at := (v_row->>'changed_at')::bigint;
    v_deleted := COALESCE((v_row->>'deleted')::boolean, false);
    v_payload_fingerprint := md5(COALESCE(v_row->'data', '{}'::jsonb)::text);
    v_base_received_at := NULLIF(v_row->>'base_received_at', '')::timestamptz;
    v_base_key := NULLIF(v_row->>'base_key', '');

    IF auth.uid() IS NULL OR v_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'kbl_atomic_upsert_local_storage_rows user mismatch';
    END IF;

    IF v_op_id IS NOT NULL THEN
      SELECT target_table, target_key, changed_at, deleted, payload_fingerprint
      INTO v_existing_op
      FROM kbl_sync_applied_ops
      WHERE user_id = v_user_id AND op_id = v_op_id;

      IF FOUND THEN
        IF
          v_existing_op.target_table = 'kbl_local_storage' AND
          v_existing_op.target_key = v_key AND
          v_existing_op.changed_at = v_changed_at AND
          v_existing_op.deleted IS NOT DISTINCT FROM v_deleted AND
          v_existing_op.payload_fingerprint IS NOT DISTINCT FROM v_payload_fingerprint
        THEN
          status := 'duplicate';
        ELSE
          status := 'skipped';
        END IF;
        RETURN NEXT;
        v_index := v_index + 1;
        CONTINUE;
      END IF;
    END IF;

    WITH upserted AS (
      INSERT INTO kbl_local_storage (
        user_id,
        key,
        data,
        changed_at,
        deleted,
        received_at
      )
      VALUES (
        v_user_id,
        v_key,
        COALESCE(v_row->'data', '{}'::jsonb),
        v_changed_at,
        v_deleted,
        now()
      )
      ON CONFLICT (user_id, key)
      DO UPDATE SET
        data = EXCLUDED.data,
        changed_at = EXCLUDED.changed_at,
        deleted = EXCLUDED.deleted,
        received_at = now()
      WHERE EXCLUDED.changed_at > kbl_local_storage.changed_at
        AND v_base_received_at IS NOT NULL
        AND (
          kbl_local_storage.received_at < v_base_received_at OR
          (
            kbl_local_storage.received_at = v_base_received_at AND
            v_base_key IS NOT NULL AND
            kbl_local_storage.key <= v_base_key
          )
        )
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_applied FROM upserted;

    IF v_applied > 0 THEN
      status := 'accepted';
      IF v_op_id IS NOT NULL THEN
        INSERT INTO kbl_sync_applied_ops (
          user_id,
          op_id,
          target_table,
          target_key,
          changed_at,
          deleted,
          payload_fingerprint
        )
        VALUES (
          v_user_id,
          v_op_id,
          'kbl_local_storage',
          v_key,
          v_changed_at,
          v_deleted,
          v_payload_fingerprint
        )
        ON CONFLICT (user_id, op_id) DO NOTHING;
      END IF;
    ELSE
      status := 'skipped';
    END IF;

    RETURN NEXT;
    v_index := v_index + 1;
  END LOOP;
END;
$kbl_atomic_upsert_local_storage_rows$;
$kbl_local_storage_fn$;

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.kbl_atomic_upsert_store_rows(JSONB) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.kbl_atomic_upsert_local_storage_rows(JSONB) TO authenticated';
END;
$kbl_duplicate_op_payload_rpc$;
