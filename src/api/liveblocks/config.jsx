/**
 * Liveblocks configuration (v1.x API via createRoomContext)
 *
 * Uses real Liveblocks when VITE_LIVEBLOCKS_PUBLIC_KEY is set,
 * falls back to mock providers for demo/development.
 */

import React from 'react';
import { createClient } from '@liveblocks/client';
import { createRoomContext } from '@liveblocks/react';

const PUBLIC_KEY = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;

let RoomProvider, useOthers, useMyPresence, useSelf, useRoom;

if (PUBLIC_KEY) {
  const client = createClient({ publicApiKey: PUBLIC_KEY });
  const ctx = createRoomContext(client);
  RoomProvider    = ctx.RoomProvider;
  useOthers       = ctx.useOthers;
  useMyPresence   = ctx.useMyPresence;
  useSelf         = ctx.useSelf;
  useRoom         = ctx.useRoom;
} else {
  // Mock providers — app runs without real Liveblocks key
  RoomProvider  = ({ children }) => <>{children}</>;
  useOthers     = () => [];
  useMyPresence = () => [null, () => {}];
  useSelf       = () => null;
  useRoom       = () => null;
}

export { RoomProvider, useOthers, useMyPresence, useSelf, useRoom };
