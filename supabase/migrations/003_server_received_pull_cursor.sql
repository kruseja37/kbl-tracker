-- KBL Tracker server-side pull cursor
--
-- Client changed_at is still used for conflict resolution, but pull pagination
-- needs a server-ordered cursor so late same-timestamp rows cannot be skipped.

ALTER TABLE kbl_sync_meta
  ADD COLUMN IF NOT EXISTS last_pull_received_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_kbl_stores_received_cursor
  ON kbl_stores(user_id, received_at, id);
