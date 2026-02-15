/**
 * Clerk Auth Provider — with mock fallback
 *
 * If VITE_CLERK_PUBLISHABLE_KEY is set → real Clerk auth.
 * Otherwise → pass-through wrapper, useVibeUser() returns random guest name.
 *
 * Usage:
 *   import { VibeClerkProvider, useVibeUser } from '../api/clerk/provider';
 *
 *   <VibeClerkProvider>
 *     <App />        // inside here useVibeUser() is safe to call
 *   </VibeClerkProvider>
 */

import React, { useRef, useState, useEffect, createContext, useContext } from 'react';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// ---- Random guest name generator (fallback when Clerk is not configured) ----
const GUEST_NAMES = ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'];

function randomGuestName() {
  const name = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${name}${num}`;
}

// ---- Context for user data (works with both Clerk and mock) ----
const VibeUserContext = createContext({
  name: 'Guest',
  avatar: null,
  isSignedIn: false,
});

// ---- Mock provider (no Clerk key) ----
function MockClerkProvider({ children }) {
  const guestName = useRef(randomGuestName());

  return (
    <VibeUserContext.Provider value={{
      name: guestName.current,
      avatar: null,
      isSignedIn: false,
    }}>
      {children}
    </VibeUserContext.Provider>
  );
}

// ---- Real Clerk provider (loaded dynamically) ----
function RealClerkProvider({ children }) {
  const [ClerkModule, setClerkModule] = useState(null);

  useEffect(() => {
    import('@clerk/clerk-react').then(setClerkModule).catch((err) => {
      console.warn('[clerk] Failed to load @clerk/clerk-react:', err.message);
    });
  }, []);

  if (!ClerkModule) {
    // Loading Clerk SDK — show children with guest data in the meantime
    return <MockClerkProvider>{children}</MockClerkProvider>;
  }

  const { ClerkProvider } = ClerkModule;

  return (
    <ClerkProvider publishableKey={CLERK_KEY}>
      <ClerkUserBridge ClerkModule={ClerkModule}>
        {children}
      </ClerkUserBridge>
    </ClerkProvider>
  );
}

// Bridge component: reads Clerk user data and puts it into VibeUserContext
// No auth gate here — handled in App.jsx after splash screen
function ClerkUserBridge({ ClerkModule, children }) {
  const { useUser } = ClerkModule;
  const { isSignedIn, user } = useUser();

  const value = (isSignedIn && user)
    ? {
        name: user.fullName || user.firstName || user.username || 'User',
        avatar: user.imageUrl || null,
        isSignedIn: true,
      }
    : {
        name: 'Guest',
        avatar: null,
        isSignedIn: false,
      };

  return (
    <VibeUserContext.Provider value={value}>
      {children}
    </VibeUserContext.Provider>
  );
}

// SignIn screen component (lazy-loaded from Clerk SDK)
function ClerkSignInScreen() {
  const [SignInComponent, setSignInComponent] = useState(null);

  useEffect(() => {
    import('@clerk/clerk-react').then((mod) => {
      setSignInComponent(() => mod.SignIn);
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-xl shadow-lg">
          ⚡
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Vibe IDE
        </h1>
      </div>
      {SignInComponent ? (
        <SignInComponent routing="hash" />
      ) : (
        <div className="text-slate-400 text-sm">Loading auth...</div>
      )}
    </div>
  );
}

// ---- Exports ----
export const VibeClerkProvider = CLERK_KEY ? RealClerkProvider : MockClerkProvider;
export const useVibeUser = () => useContext(VibeUserContext);
export const isClerkEnabled = !!CLERK_KEY;
export { ClerkSignInScreen };
