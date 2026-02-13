import React from 'react';
import ReactDOM from 'react-dom/client';
import { RoomProvider } from './api/liveblocks/config.jsx';
import VibeIDE from './App';
import './index.css';

// Generate a random display name for this browser session
const sessionName = `User-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RoomProvider
      id="vibe-ide-main"
      initialPresence={{
        cursor: null,
        name: sessionName,
        color: '#9333EA',
      }}
    >
      <VibeIDE />
    </RoomProvider>
  </React.StrictMode>
);
