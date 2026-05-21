-- KBL Tracker atomic sync writes
--
-- These RPCs make cloud writes stale-safe at the database boundary. A queued
-- write may only replace an existing row when its changed_at is strictly newer
-- than the row already stored in the cloud. Stable op_id values make accepted
-- incremental queue writes idempotent if a device dies before clearing its
-- durable queue copy.

CREATE TABLE IF NOT EXISTS kbl_sync_applied_ops (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  op_id TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_key TEXT NOT NULL,
  changed_at BIGINT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, op_id)
);

ALTER TABLE kbl_sync_applied_ops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own applied sync ops"
  ON kbl_sync_applied_ops;

CREATE POLICY "Users can manage their own applied sync ops"
  ON kbl_sync_applied_ops FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DO $kbl_atomic_sync_rpc$
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
  v_changed_at BIGINT;
  v_deleted BOOLEAN;
  v_applied INTEGER;
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
    v_changed_at := (v_row->>'changed_at')::bigint;
    v_deleted := COALESCE((v_row->>'deleted')::boolean, false);

    IF auth.uid() IS NULL OR v_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'kbl_atomic_upsert_store_rows user mismatch';
    END IF;

    IF v_op_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM kbl_sync_applied_ops
      WHERE user_id = v_user_id AND op_id = v_op_id
    ) THEN
      status := 'duplicate';
      RETURN NEXT;
      v_index := v_index + 1;
      CONTINUE;
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
          changed_at
        )
        VALUES (
          v_user_id,
          v_op_id,
          'kbl_stores',
          v_db_name || '|' || v_store_name || '|' || v_record_key,
          v_changed_at
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
  v_applied INTEGER;
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

    IF auth.uid() IS NULL OR v_user_id <> auth.uid() THEN
      RAISE EXCEPTION 'kbl_atomic_upsert_local_storage_rows user mismatch';
    END IF;

    IF v_op_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM kbl_sync_applied_ops
      WHERE user_id = v_user_id AND op_id = v_op_id
    ) THEN
      status := 'duplicate';
      RETURN NEXT;
      v_index := v_index + 1;
      CONTINUE;
    END IF;

    WITH upserted AS (
      INSERT INTO kbl_local_storage (
        user_id,
        key,
        data,
        changed_at,
        deleted
      )
      VALUES (
        v_user_id,
        v_key,
        COALESCE(v_row->'data', '{}'::jsonb),
        v_changed_at,
        v_deleted
      )
      ON CONFLICT (user_id, key)
      DO UPDATE SET
        data = EXCLUDED.data,
        changed_at = EXCLUDED.changed_at,
        deleted = EXCLUDED.deleted
      WHERE EXCLUDED.changed_at > kbl_local_storage.changed_at
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
          changed_at
        )
        VALUES (
          v_user_id,
          v_op_id,
          'kbl_local_storage',
          v_key,
          v_changed_at
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
$kbl_atomic_sync_rpc$;
