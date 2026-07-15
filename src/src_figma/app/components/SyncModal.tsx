/**
 * SyncModal — Cloud sync controls (login, status, upload/download)
 */

import { useCallback, useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useSyncStatus } from '../../../hooks/useSyncStatus';
import { syncEngine, type SyncDiagnosticsSnapshot } from '../../../utils/syncEngine';
import { LoginForm } from './LoginForm';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DIAGNOSTICS_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId !== null) clearTimeout(timeoutId);
  });
}

export function SyncModal({ isOpen, onClose }: SyncModalProps) {
  const { user, isAuthenticated, isLoading: authLoading, error: authError, signIn, signOut } = useAuth();
  const sync = useSyncStatus();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border-4 border-[#0066FF] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="font-['Press_Start_2P'] text-sm text-[#0066FF] mb-6">CLOUD SYNC</h2>

        {authLoading ? (
          <div className="flex items-center gap-2 text-gray-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading...
          </div>
        ) : !isAuthenticated ? (
          <LoginForm onSignIn={signIn} error={authError} />
        ) : (
          <SyncControls
            userEmail={user?.email ?? ''}
            sync={sync}
            onSignOut={signOut}
          />
        )}
      </div>
    </div>
  );
}

function SyncControls({
  userEmail,
  sync,
  onSignOut,
}: {
  userEmail: string;
  sync: ReturnType<typeof useSyncStatus>;
  onSignOut: () => Promise<void>;
}) {
  const [confirm, setConfirm] = useState<'upload' | 'download' | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<SyncDiagnosticsSnapshot | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const hasDiagnosticWarnings = (diagnostics?.warnings.length ?? 0) > 0;
  const hasLivePendingWrites = sync.pendingCount > 0;
  const hasOperationError = operationError !== null;
  const hasBuildFreshnessProblem = Boolean(
    diagnostics && (
      diagnostics.build.latest?.matchesCurrent === false ||
      (
        diagnostics.build.mode !== 'development' &&
        diagnostics.build.mode !== 'test' &&
        diagnostics.build.latest?.matchesCurrent !== true
      )
    )
  );
  const hasDiagnosticProblems = Boolean(
    hasOperationError ||
    hasLivePendingWrites ||
    hasBuildFreshnessProblem ||
    (diagnostics && (
        hasDiagnosticWarnings ||
        diagnostics.pendingCount > 0 ||
        diagnostics.localStorage.status !== 'matched' ||
        diagnostics.stores.some((store) => store.status !== 'matched')
      ))
  );
  const diagnosticsChecked = diagnostics !== null;

  const statusColor = {
    idle: diagnosticsLoading || !diagnosticsChecked || hasDiagnosticProblems ? '#FFCC66' : '#44FF44',
    syncing: '#FFFF44',
    error: '#FF4444',
    offline: '#888888',
    disabled: '#555555',
  }[sync.state];

  const statusText = {
    idle: diagnosticsLoading
      ? 'CHECKING SYNC DATA'
      : hasDiagnosticProblems
        ? 'SYNC ISSUES'
        : diagnosticsChecked
          ? 'SYNCED'
          : 'SYNC NOT CHECKED',
    syncing: 'SYNCING...',
    error: 'ERROR',
    offline: 'OFFLINE',
    disabled: 'DISABLED',
  }[sync.state];

  const handleDiagnostics = useCallback(async () => {
    setOperationError(null);
    setDiagnosticsLoading(true);
    try {
      setDiagnostics(await withTimeout(
        syncEngine.getDiagnostics(),
        DIAGNOSTICS_TIMEOUT_MS,
        'Sync diagnostics timed out. Close and reopen Cloud Sync, or use Upload/Download if you know which side should win.',
      ));
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Diagnostics failed');
    } finally {
      setDiagnosticsLoading(false);
    }
  }, []);

  useEffect(() => {
    void syncEngine.init();
  }, []);

  useEffect(() => {
    if (sync.pendingCount === 0) {
      void handleDiagnostics();
    }
  }, [handleDiagnostics, sync.pendingCount]);

  const handleSyncNow = async () => {
    setConfirm(null);
    setOperationError(null);
    setProgress('Syncing pending changes...');
    try {
      await syncEngine.init();
      await syncEngine.flush();
      await sync.pull();
      await handleDiagnostics();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setProgress(null);
    }
  };

  const handleUpload = async () => {
    setConfirm(null);
    setOperationError(null);
    setProgress('Uploading...');
    try {
      await sync.replaceCloudWithLocal((db, store, sent, total) => {
        setProgress(`${db}.${store}: ${sent}/${total}`);
      }, { replaceExisting: true });
      // Initialize sync engine after first upload
      syncEngine.init();
      await handleDiagnostics();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setProgress(null);
    }
  };

  const handleDownload = async () => {
    setConfirm(null);
    setOperationError(null);
    setProgress('Downloading...');
    try {
      await sync.replaceLocalWithCloud();
      syncEngine.init();
      await handleDiagnostics();
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Download failed');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
        <span className="text-xs text-gray-300 font-mono">{statusText}</span>
        {sync.pendingCount > 0 && (
          <span className="text-[10px] text-gray-500">({sync.pendingCount} pending)</span>
        )}
      </div>

      {sync.error && (
        <p className="text-[10px] text-[#FF4444] bg-[#FF4444]/10 p-2 border border-[#FF4444]/30">{sync.error}</p>
      )}
      {operationError && (
        <p className="text-[10px] text-[#FF4444] bg-[#FF4444]/10 p-2 border border-[#FF4444]/30">{operationError}</p>
      )}

      {sync.lastPullAt > 0 && (
        <p className="text-[10px] text-gray-500">
          Last sync: {new Date(sync.lastPullAt).toLocaleString()}
        </p>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-gray-700">
        {progress ? (
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-mono text-[10px]">{progress}</span>
          </div>
        ) : confirm === 'upload' ? (
          <ConfirmPanel
            message="Replace CLOUD data with THIS DEVICE's data? Cloud data will be overwritten."
            onConfirm={handleUpload}
            onCancel={() => setConfirm(null)}
          />
        ) : confirm === 'download' ? (
          <ConfirmPanel
            message="Replace THIS DEVICE's data with CLOUD data? Local data will be overwritten."
            onConfirm={handleDownload}
            onCancel={() => setConfirm(null)}
          />
        ) : (
          <>
            <button
              onClick={handleSyncNow}
              className="w-full bg-[#0F766E] text-white font-['Press_Start_2P'] text-[8px] py-2.5 hover:bg-[#0D9488] flex items-center justify-center gap-2"
            >
              <Cloud className="w-3 h-3" />
              SYNC NOW
            </button>
            <button
              onClick={() => setConfirm('upload')}
              className="w-full bg-[#1A44CC] text-white font-['Press_Start_2P'] text-[8px] py-2.5 hover:bg-[#2255DD] flex items-center justify-center gap-2"
            >
              <Cloud className="w-3 h-3" />
              UPLOAD TO CLOUD
            </button>
            <button
              onClick={() => setConfirm('download')}
              className="w-full bg-[#333] text-white font-['Press_Start_2P'] text-[8px] py-2.5 hover:bg-[#444] flex items-center justify-center gap-2"
            >
              <CloudOff className="w-3 h-3" />
              DOWNLOAD FROM CLOUD
            </button>
            <button
              onClick={() => void handleDiagnostics()}
              disabled={diagnosticsLoading}
              className="w-full bg-[#111827] text-white font-['Press_Start_2P'] text-[8px] py-2.5 hover:bg-[#1f2937] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {diagnosticsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
              CHECK SYNC DATA
            </button>
          </>
        )}
      </div>

      {diagnostics && <DiagnosticsPanel diagnostics={diagnostics} />}

      {/* User info + sign out */}
      <div className="pt-2 border-t border-gray-700 flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-mono truncate">{userEmail}</span>
        <button
          onClick={onSignOut}
          className="text-[10px] text-gray-400 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: SyncDiagnosticsSnapshot }) {
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  const waitForWaitingWorker = (registration: ServiceWorkerRegistration | undefined) => new Promise<ServiceWorker | null>((resolve) => {
    if (!registration) {
      resolve(null);
      return;
    }
    if (registration.waiting) {
      resolve(registration.waiting);
      return;
    }
    const installingWorker = registration.installing;
    if (!installingWorker) {
      resolve(registration.waiting ?? null);
      return;
    }

    const timeout = window.setTimeout(() => resolve(registration.waiting ?? null), 5000);
    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' || installingWorker.state === 'activated') {
        window.clearTimeout(timeout);
        resolve(registration.waiting ?? installingWorker);
      }
    }, { once: true });
  });

  const handleReloadApp = () => {
    if (typeof window === 'undefined') return;
    void (async () => {
      setUpdateError(null);
      setUpdateLoading(true);
      try {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          const updatedRegistration = await registration?.update();
          const waitingWorker = await waitForWaitingWorker(updatedRegistration ?? registration);
          if (waitingWorker) {
            const controllerChanged = new Promise<void>((resolve) => {
              const timeout = window.setTimeout(resolve, 5000);
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.clearTimeout(timeout);
                resolve();
              }, { once: true });
            });
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            await controllerChanged;
          }
        }
        window.location.reload();
      } catch (error) {
        setUpdateError(error instanceof Error ? error.message : 'Update check failed');
        setUpdateLoading(false);
      }
    })();
  };
  const formatBuild = (build: { id?: string; version?: string; sha?: string; builtAt?: string }) => [
    build.id || build.version || 'unknown',
    build.sha,
  ].filter(Boolean).join(' @ ');
  const latestBuild = diagnostics.build.latest;
  const freshnessText = latestBuild?.error
    ? `unknown (${latestBuild.error})`
    : latestBuild?.matchesCurrent === true
      ? 'current'
      : latestBuild?.matchesCurrent === false
        ? 'stale'
        : 'unknown';
  const freshnessClass = latestBuild?.matchesCurrent === true ? 'text-[#44FF44]' : 'text-[#FFCC66]';
  const priorityStores = new Set([
    'kbl-event-log.gameHeaders',
    'kbl-event-log.atBatEvents',
    'kbl-event-log.fieldingEvents',
    'kbl-event-log.betweenPlayEvents',
    'kbl-tracker.completedGames',
    'kbl-tracker.rosterSnapshots',
    'kbl-manager-identity.managerProfiles',
    'kbl-manager-identity.managerAssignments',
    'kbl-league-builder.globalTeams',
    'kbl-league-builder.teamRosters',
  ]);
  const visibleStores = diagnostics.stores
    .filter((store) => priorityStores.has(`${store.dbName}.${store.storeName}`) || store.status !== 'matched')
    .sort((left, right) => `${left.dbName}.${left.storeName}`.localeCompare(`${right.dbName}.${right.storeName}`));

  return (
    <div className="border-t border-gray-700 pt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-['Press_Start_2P'] text-[8px] text-[#C4A853]">SYNC DIAGNOSTICS</div>
        <div className="text-[9px] text-gray-500 font-mono">
          {new Date(diagnostics.generatedAt).toLocaleTimeString()}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono text-gray-400">
        <div>Device: {diagnostics.deviceId.slice(-10)}</div>
        <div>Pending: {diagnostics.pendingCount}</div>
        <div>
          Build: {formatBuild(diagnostics.build)}
        </div>
        <div>Built: {diagnostics.build.builtAt ? new Date(diagnostics.build.builtAt).toLocaleString() : 'unknown'}</div>
        <div>
          Latest: {latestBuild ? formatBuild(latestBuild) : 'unknown'}
        </div>
        <div className={freshnessClass}>
          Freshness: {freshnessText}
        </div>
        <div>
          Local storage: {diagnostics.localStorage.localCount}/{diagnostics.localStorage.cloudCount ?? '?'} {diagnostics.localStorage.status}
        </div>
        <div>
          PWA: {diagnostics.build.serviceWorkerControlled === undefined
            ? 'n/a'
            : diagnostics.build.serviceWorkerControlled
              ? 'controlled'
              : 'not controlled'}
          {diagnostics.build.serviceWorkerWaiting ? ' / update waiting' : ''}
          {diagnostics.build.serviceWorkerInstalling ? ' / installing' : ''}
        </div>
        <div className="col-span-2 truncate" title={diagnostics.build.serviceWorkerActiveScriptURL ?? diagnostics.build.serviceWorkerScriptURL}>
          SW active: {diagnostics.build.serviceWorkerActiveScriptURL ?? diagnostics.build.serviceWorkerScriptURL ?? 'none'}
        </div>
        <div className="col-span-2 truncate" title={diagnostics.build.serviceWorkerWaitingScriptURL}>
          SW waiting: {diagnostics.build.serviceWorkerWaitingScriptURL ?? 'none'}
        </div>
        <div className="col-span-2 truncate" title={diagnostics.build.serviceWorkerCacheNames?.join(', ')}>
          Caches: {diagnostics.build.serviceWorkerCacheNames?.join(', ') ?? 'unknown'}
        </div>
      </div>
      {diagnostics.build.serviceWorkerControlled !== undefined && (
        <button
          onClick={handleReloadApp}
          disabled={updateLoading}
          className="w-full bg-[#263238] text-white font-['Press_Start_2P'] text-[8px] py-2 hover:bg-[#37474f]"
        >
          {updateLoading ? 'CHECKING UPDATE...' : 'CHECK FOR UPDATE / RELOAD'}
        </button>
      )}
      {updateError && (
        <div className="border border-[#FF4444]/40 bg-[#FF4444]/10 p-2 text-[9px] text-[#FF8888] font-mono">
          Update failed: {updateError}
        </div>
      )}
      {diagnostics.warnings.length > 0 && (
        <div className="border border-[#FFCC66]/40 bg-[#FFCC66]/10 p-2 text-[9px] text-[#FFCC66] font-mono space-y-1 max-h-28 overflow-y-auto">
          <div className="font-['Press_Start_2P'] text-[7px]">WARNINGS: {diagnostics.warnings.length}</div>
          {diagnostics.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      )}
      <div className="max-h-56 overflow-y-auto border border-gray-700">
        <table className="w-full text-left text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#111827] text-gray-400">
            <tr>
              <th className="p-1">Store</th>
              <th className="p-1 text-right">Local</th>
              <th className="p-1 text-right">Cloud</th>
              <th className="p-1">State</th>
            </tr>
          </thead>
          <tbody>
            {visibleStores.map((store) => (
              <tr
                key={`${store.dbName}.${store.storeName}`}
                className={store.status === 'matched' ? 'text-gray-400' : 'text-[#FFCC66]'}
              >
                <td className="p-1">{store.dbName}.{store.storeName}</td>
                <td className="p-1 text-right">{store.localCount ?? '?'}</td>
                <td className="p-1 text-right">{store.cloudCount ?? '?'}</td>
                <td className="p-1 uppercase">{store.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfirmPanel({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-[#FF4444]/10 border border-[#FF4444]/30 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-[#FF4444] shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-300">{message}</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          className="flex-1 bg-[#FF4444] text-white font-['Press_Start_2P'] text-[8px] py-2 hover:bg-[#FF6666]"
        >
          CONFIRM
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-[#333] text-white font-['Press_Start_2P'] text-[8px] py-2 hover:bg-[#444]"
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// Cloud status icon for the AppHome header
export function SyncStatusIcon({ onClick }: { onClick: () => void }) {
  const sync = useSyncStatus();

  const color = sync.pendingCount > 0
    ? '#FFFF44'
    : {
        idle: '#44FF44',
        syncing: '#FFFF44',
        error: '#FF4444',
        offline: '#888888',
        disabled: '#555555',
      }[sync.state];

  return (
    <button onClick={onClick} className="p-1 hover:opacity-80" title="Cloud Sync">
      <Cloud className="w-4 h-4" style={{ color }} />
    </button>
  );
}
