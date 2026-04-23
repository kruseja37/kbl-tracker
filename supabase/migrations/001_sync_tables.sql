-- KBL Tracker Cloud Sync Schema
-- Run this in the Supabase SQL Editor to create the sync tables.

-- ============================================================
-- 1. kbl_stores — main data table (IndexedDB records)
-- ============================================================
CREATE TABLE kbl_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  db_name TEXT NOT NULL,
  store_name TEXT NOT NULL,
  record_key TEXT NOT NULL,
  data JSONB NOT NULL,
  changed_at BIGINT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(user_id, db_name, store_name, record_key)
);

CREATE INDEX idx_kbl_stores_cursor ON kbl_stores(user_id, changed_at, id);
CREATE INDEX idx_kbl_stores_lookup ON kbl_stores(user_id, db_name, store_name);

ALTER TABLE kbl_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own data"
  ON kbl_stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data"
  ON kbl_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data"
  ON kbl_stores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data"
  ON kbl_stores FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. kbl_sync_meta — per-device sync cursor
-- ============================================================
CREATE TABLE kbl_sync_meta (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  device_id TEXT NOT NULL,
  last_pull_changed_at BIGINT NOT NULL DEFAULT 0,
  last_pull_id UUID,
  PRIMARY KEY(user_id, device_id)
);

ALTER TABLE kbl_sync_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own sync meta"
  ON kbl_sync_meta FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- 3. kbl_local_storage — localStorage items
-- ============================================================
CREATE TABLE kbl_local_storage (
  user_id UUID NOT NULL REFERENCES auth.users(id),
  key TEXT NOT NULL,
  data JSONB NOT NULL,
  changed_at BIGINT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY(user_id, key)
);

ALTER TABLE kbl_local_storage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own local storage"
  ON kbl_local_storage FOR ALL
  USING (auth.uid() = user_id);
