-- KBL Tracker duplicate sync-op concurrency hardening
--
-- The atomic write RPCs validate duplicate op_ids before mutating sync rows.
-- Without a per-op lock, two concurrent calls with the same op_id but different
-- payloads can both pass the precheck before either records the applied op. Add
-- a transaction-scoped advisory lock keyed by (user_id, op_id) before that
-- precheck so duplicate validation and row mutation are serialized per op.

DO $kbl_duplicate_op_lock_rpc$
DECLARE
  v_store_fn TEXT;
  v_local_fn TEXT;
  v_locked_store_fn TEXT;
  v_locked_local_fn TEXT;
BEGIN
  SELECT pg_get_functiondef('public.kbl_atomic_upsert_store_rows(jsonb)'::regprocedure)
  INTO v_store_fn;

  v_locked_store_fn := regexp_replace(
    v_store_fn,
    '(IF v_op_id IS NOT NULL THEN\s+)(SELECT target_table, target_key, changed_at, deleted, payload_fingerprint)',
    E'\\1PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), hashtext(v_op_id));\n      \\2'
  );

  IF v_locked_store_fn = v_store_fn THEN
    RAISE EXCEPTION 'Could not install duplicate-op advisory lock in kbl_atomic_upsert_store_rows';
  END IF;

  EXECUTE v_locked_store_fn;

  SELECT pg_get_functiondef('public.kbl_atomic_upsert_local_storage_rows(jsonb)'::regprocedure)
  INTO v_local_fn;

  v_locked_local_fn := regexp_replace(
    v_local_fn,
    '(IF v_op_id IS NOT NULL THEN\s+)(SELECT target_table, target_key, changed_at, deleted, payload_fingerprint)',
    E'\\1PERFORM pg_advisory_xact_lock(hashtext(v_user_id::text), hashtext(v_op_id));\n      \\2'
  );

  IF v_locked_local_fn = v_local_fn THEN
    RAISE EXCEPTION 'Could not install duplicate-op advisory lock in kbl_atomic_upsert_local_storage_rows';
  END IF;

  EXECUTE v_locked_local_fn;

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.kbl_atomic_upsert_store_rows(JSONB) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.kbl_atomic_upsert_local_storage_rows(JSONB) TO authenticated';
END;
$kbl_duplicate_op_lock_rpc$;
