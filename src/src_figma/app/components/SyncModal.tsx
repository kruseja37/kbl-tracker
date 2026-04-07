/**
 * SyncModal — Cloud sync controls (login, status, upload/download)
 */

import { useState } from 'react';
import { Cloud, CloudOff, Loader2, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useSyncStatus } from '../../../hooks/useSyncStatus';
import { syncEngine } from '../../../utils/syncEngine';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SyncModal({ isOpen, onClose }: SyncModalProps) {
  const { user, isAuthenticated, isLoading: authLoading, error: authError, signIn, signOut } = useAuth();
  const sync = useSyncStatus();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border-4 border-[#0066FF] max-w-md w-full p-6 relative"
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

function LoginForm({ onSignIn, error }: { onSignIn: (email: string, password: string) => Promise<void>; error: string | null }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSignIn(email, password);
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-xs text-gray-400 mb-4">Sign in to sync data across devices.</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full bg-black border-2 border-gray-600 text-white text-xs p-3 font-mono focus:border-[#0066FF] outline-none"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full bg-black border-2 border-gray-600 text-white text-xs p-3 font-mono focus:border-[#0066FF] outline-none"
        required
      />

      {error && <p className="text-[#FF4444] text-[10px]">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#0066FF] text-black font-['Press_Start_2P'] text-[10px] py-3 hover:bg-[#3388FF] disabled:opacity-50"
      >
        {loading ? 'SIGNING IN...' : 'SIGN IN'}
      </button>
    </form>
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

  const statusColor = {
    idle: '#44FF44',
    syncing: '#FFFF44',
    error: '#FF4444',
    offline: '#888888',
    disabled: '#555555',
  }[sync.state];

  const statusText = {
    idle: 'SYNCED',
    syncing: 'SYNCING...',
    error: 'ERROR',
    offline: 'OFFLINE',
    disabled: 'DISABLED',
  }[sync.state];

  const handleUpload = async () => {
    setConfirm(null);
    setProgress('Uploading...');
    await sync.replaceCloudWithLocal((db, store, sent, total) => {
      setProgress(`${db}.${store}: ${sent}/${total}`);
    });
    setProgress(null);
    // Initialize sync engine after first upload
    syncEngine.init();
  };

  const handleDownload = async () => {
    setConfirm(null);
    setProgress('Downloading...');
    await sync.replaceLocalWithCloud();
    setProgress(null);
    syncEngine.init();
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
          </>
        )}
      </div>

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

  const color = {
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
