import { openDB, type DBSchema } from 'idb';
import client from '../api/client';

interface MindSphereDB extends DBSchema {
  events: {
    key: string;
    value: {
      id?: string;
      sessionId: string;
      type: string;
      timestamp: string;
      metadata?: any;
    };
  };
}

const dbPromise = openDB<MindSphereDB>('mindsphere-db', 1, {
  upgrade(db) {
    db.createObjectStore('events', { keyPath: 'id', autoIncrement: true }); // auto-increment if no ID
  },
});

export const saveEventToBuffer = async (event: any) => {
  const db = await dbPromise;
  await db.add('events', event);
  // Optional: Trigger sync if online immediately? Or wait for batch.
};

let isSyncing = false;

export const syncEvents = async () => {
  if (!navigator.onLine || isSyncing) return;
  isSyncing = true;
  try {
      const db = await dbPromise;
      const events = await db.getAll('events');
      if (events.length === 0) return;

      // Group by sessionId to match backend API batching
      const sessions = new Set(events.map(e => e.sessionId));
      
      for (const sessionId of sessions) {
        const sessionEvents = events.filter(e => e.sessionId === sessionId);
        try {
          await client.post('/api/sessions/events', {
            sessionId,
            events: sessionEvents
          });
          
          // Delete synced events
          const tx = db.transaction('events', 'readwrite');
          await Promise.all(sessionEvents.map(e => tx.store.delete(e.id as any))); // id is auto-generated key if using add without key
          await tx.done;
          console.log(`Synced ${sessionEvents.length} events for session ${sessionId}`);
        } catch (error) {
          console.error(`Failed to sync session ${sessionId}`, error);
          // Keep in DB for retry (exponential backoff logic not implemented here for MVP)
        }
      }
  } finally {
      isSyncing = false;
  }
};

// Initialize listeners
let syncInterval: ReturnType<typeof setInterval> | null = null;
export const initSync = () => {
  if (syncInterval) return; // Prevent multiple initializations (e.g., from React StrictMode/HMR)
  window.addEventListener('online', syncEvents);
  syncInterval = setInterval(syncEvents, 5 * 60 * 1000); // 5 minutes
};
