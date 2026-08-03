import { useEffect, useState } from 'react';
import { getPendingSales, clearPendingSale } from '../lib/offlineStore';
import { createSale } from '../api/sales';

export function useBackgroundSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline || syncing) return;

    let mounted = true;

    async function syncOfflineSales() {
      setSyncing(true);
      try {
        const pending = await getPendingSales();
        if (pending.length === 0) return;

        for (const p of pending) {
          if (!mounted) break;
          try {
            await createSale(p.payload as Parameters<typeof createSale>[0]);
            await clearPendingSale(p.offlineId);
          } catch (err) {
            console.error('Failed to sync offline sale', err);
          }
        }
      } finally {
        if (mounted) {
          setSyncing(false);
          const remaining = await getPendingSales();
          setPendingCount(remaining.length);
        }
      }
    }

    syncOfflineSales();

    // Check periodically for syncs as well in case of race conditions
    const interval = setInterval(() => {
      syncOfflineSales();
      getPendingSales().then(p => setPendingCount(p.length));
    }, 60000); // every minute

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isOnline, syncing]);

  return { isOnline, syncing, pendingCount };
}
