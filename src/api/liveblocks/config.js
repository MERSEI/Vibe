/**
 * Liveblocks configuration (v1.x API via createRoomContext)
 *
 * Public key (pk_...) is safe to expose in the browser.
 * Never use the secret key (sk_...) on the client side.
 *
 * Export RoomProvider and all hooks from here so the rest
 * of the app imports from a single source of truth.
 */

import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';

const client = createClient({
  publicApiKey: import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
});

export const {
  RoomProvider,
  useOthers,
  useMyPresence,
  useSelf,
} = createRoomContext(client);
