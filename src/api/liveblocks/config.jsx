/**
 * Liveblocks configuration (v1.x API via createRoomContext)
 *
 * For demo purposes, this exports mock providers that allow
 * the app to run without real Liveblocks collaboration.
 *
 * In production, you would:
 * 1. Set VITE_LIVEBLOCKS_PUBLIC_KEY environment variable
 * 2. Replace these mocks with real Liveblocks providers via createRoomContext
 */

import React from 'react';

// Mock providers - sufficient for demo/development
export const RoomProvider = ({ children, id, initialPresence }) => {
  return <>{children}</>;
};

export const useOthers = () => {
  // Return empty list of collaborators (mocked in useCollaborators hook instead)
  return [];
};

export const useMyPresence = () => {
  // Return empty presence and no-op setter
  return [null, () => {}];
};

export const useSelf = () => {
  // Return null (no self presence)
  return null;
};
