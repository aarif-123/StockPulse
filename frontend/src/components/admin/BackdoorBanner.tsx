import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const BackdoorBanner: React.FC = () => {
  const { isBackdoorMode, user, exitBackdoorSession } = useAuth();
  const [exiting, setExiting] = useState(false);

  if (!isBackdoorMode || !user) return null;

  const handleExit = async () => {
    setExiting(true);
    try {
      await exitBackdoorSession();
    } catch (err) {
      console.error(err);
    } finally {
      setExiting(false);
    }
  };

  return (
    <div className="bg-amber-600 dark:bg-amber-700 text-white font-medium py-2 px-4 shadow-md flex items-center justify-between text-sm sticky top-0 z-50 border-b border-amber-500 animate-pulse">
      <div className="flex items-center gap-2">
        <span className="text-base">⚠️</span>
        <span>
          <strong>Backdoor Entry Active:</strong> Monitoring & viewing portal as{' '}
          <span className="underline decoration-wavy font-bold">{user.name} ({user.email})</span>.
          All actions are audited under this backdoor session.
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={exiting}
        className="bg-white hover:bg-slate-100 text-amber-700 hover:text-amber-800 disabled:bg-slate-300 font-bold px-3 py-1 rounded transition-colors text-xs flex items-center gap-1 shadow-sm"
      >
        {exiting ? 'Restoring Admin...' : 'Exit Backdoor Session ↩'}
      </button>
    </div>
  );
};
