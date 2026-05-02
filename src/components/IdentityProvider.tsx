'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getIdentity, saveIdentity } from '@/lib/identity';
import type { Identity } from '@/lib/types';

type Ctx = {
  identity: Identity;
  signOut: () => void;
};

const IdentityCtx = createContext<Ctx | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setIdentity(getIdentity());
    setReady(true);
  }, []);

  if (!ready) return <Spinner />;

  if (!identity) {
    return (
      <NameForm
        onSaved={(next) => setIdentity(next)}
      />
    );
  }

  function signOut() {
    localStorage.removeItem('wedding_uuid');
    localStorage.removeItem('wedding_name');
    setIdentity(null);
  }

  return (
    <IdentityCtx.Provider value={{ identity, signOut }}>
      {children}
    </IdentityCtx.Provider>
  );
}

export function useIdentity() {
  const ctx = useContext(IdentityCtx);
  if (!ctx) throw new Error('useIdentity must be used inside IdentityProvider');
  return ctx;
}

function Spinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-olive-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-olive-200 border-t-olive-600" />
    </div>
  );
}

function NameForm({ onSaved }: { onSaved: (id: Identity) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const next = await saveIdentity(name);
      onSaved(next);
    } catch (e: any) {
      setErr(e?.message ?? 'Could not save your name');
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-olive-50 via-amber-50 to-olive-100 p-6">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-xl">
        <h1 className="text-center font-display text-3xl text-olive-900">
          Welcome
        </h1>
        <p className="mt-2 text-center text-sm text-olive-600">
          Tell us your name so we can credit your photos & likes.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            inputMode="text"
            autoComplete="given-name"
            className="w-full rounded-2xl border border-olive-200 bg-olive-50 px-4 py-4 text-lg outline-none transition focus:border-olive-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full rounded-2xl bg-olive-600 px-4 py-4 text-lg font-semibold text-white shadow-md transition active:scale-95 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Continue'}
          </button>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </form>
      </div>
    </main>
  );
}
