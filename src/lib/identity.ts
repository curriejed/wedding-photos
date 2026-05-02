'use client';

import { supabase } from './supabase';
import type { Identity } from './types';

const ID_KEY = 'wedding_uuid';
const NAME_KEY = 'wedding_name';
const ADMIN_KEY = 'wedding_admin';

export function getIdentity(): Identity | null {
  if (typeof window === 'undefined') return null;
  const id = localStorage.getItem(ID_KEY);
  const name = localStorage.getItem(NAME_KEY);
  if (!id || !name) return null;
  return { id, name };
}

export async function saveIdentity(rawName: string): Promise<Identity> {
  const name = rawName.trim();
  if (!name) throw new Error('Name is required');

  const id =
    localStorage.getItem(ID_KEY) ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : fallbackUuid());

  localStorage.setItem(ID_KEY, id);
  localStorage.setItem(NAME_KEY, name);

  const { error } = await supabase.from('profiles').upsert({ id, name });
  if (error) {
    localStorage.removeItem(ID_KEY);
    localStorage.removeItem(NAME_KEY);
    throw error;
  }

  return { id, name };
}

export function clearIdentity() {
  localStorage.removeItem(ID_KEY);
  localStorage.removeItem(NAME_KEY);
}

export function isAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_KEY) === '1';
}

export function setAdmin(on: boolean) {
  if (on) localStorage.setItem(ADMIN_KEY, '1');
  else localStorage.removeItem(ADMIN_KEY);
}

function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
