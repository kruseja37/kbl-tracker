/**
 * Hook exposing sync engine status to React components.
 * Re-renders on status changes via CustomEvent listener.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  syncEngine,
  type ReplaceCloudWithLocalOptions,
  type SyncStatus,
} from '../utils/syncEngine';

export function useSyncStatus(): SyncStatus & {
  pull: () => Promise<void>;
  replaceLocalWithCloud: () => Promise<void>;
  replaceCloudWithLocal: (
    onProgress?: (db: string, store: string, sent: number, total: number) => void,
    options?: ReplaceCloudWithLocalOptions,
  ) => Promise<void>;
  setEnabled: (enabled: boolean) => void;
  isEnabled: boolean;
} {
  const [status, setStatus] = useState<SyncStatus>(syncEngine.getStatus());

  useEffect(() => {
    const handler = () => setStatus(syncEngine.getStatus());
    window.addEventListener('status-change', handler);
    window.addEventListener('sync-complete', handler);
    return () => {
      window.removeEventListener('status-change', handler);
      window.removeEventListener('sync-complete', handler);
    };
  }, []);

  const pull = useCallback(() => syncEngine.pull(), []);
  const replaceLocalWithCloud = useCallback(() => syncEngine.replaceLocalWithCloud(), []);
  const replaceCloudWithLocal = useCallback(
    (
      onProgress?: (db: string, store: string, sent: number, total: number) => void,
      options?: ReplaceCloudWithLocalOptions,
    ) => syncEngine.replaceCloudWithLocal(onProgress, options),
    []
  );
  const setEnabled = useCallback((enabled: boolean) => {
    syncEngine.setEnabled(enabled);
    setStatus(syncEngine.getStatus());
  }, []);

  return {
    ...status,
    pull,
    replaceLocalWithCloud,
    replaceCloudWithLocal,
    setEnabled,
    isEnabled: syncEngine.isEnabled(),
  };
}
