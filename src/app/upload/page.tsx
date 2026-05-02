'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { supabase, BUCKET } from '@/lib/supabase';
import { useIdentity } from '@/components/IdentityProvider';

export default function UploadPage() {
  const { identity } = useIdentity();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [err, setErr] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;

    setErr(null);
    setBusy(true);

    try {
      let i = 0;
      for (const file of files) {
        i++;
        setProgress(`Uploading ${i} of ${files.length}…`);

        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const path = `${slugify(identity.name)}/${Date.now()}-${cryptoRandom()}.${ext}`;

        const up = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type || 'image/jpeg',
          cacheControl: '3600',
        });
        if (up.error) throw up.error;

        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

        const ins = await supabase.from('photos').insert({
          user_id: identity.id,
          user_name: identity.name,
          storage_path: path,
          public_url: pub.publicUrl,
        });
        if (ins.error) throw ins.error;
      }
      router.push('/');
    } catch (e: any) {
      setErr(e?.message ?? 'Upload failed');
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl flex-col items-center justify-center px-6 pb-28 pt-10">
      <h1 className="font-display text-3xl text-olive-900">Share Photos</h1>
      <p className="mt-2 max-w-xs text-center text-sm text-olive-500">
        Hi {identity.name} — your photos go straight to the live gallery.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mt-12 flex h-44 w-44 flex-col items-center justify-center gap-2 rounded-full bg-olive-600 text-white shadow-xl transition active:scale-95 disabled:opacity-60"
      >
        {busy ? (
          <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/40 border-t-white" />
        ) : (
          <Camera size={72} strokeWidth={1.75} />
        )}
      </button>

      <p className="mt-4 text-xs text-olive-400">
        You can pick multiple photos at once.
      </p>

      {progress && (
        <p className="mt-6 text-sm font-medium text-olive-700">{progress}</p>
      )}
      {err && <p className="mt-6 text-sm text-red-600">{err}</p>}
    </main>
  );
}

function cryptoRandom() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
    return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

function slugify(s: string) {
  const base = s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'guest';
}
