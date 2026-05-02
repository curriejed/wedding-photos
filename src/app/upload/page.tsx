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

        setProgress(`Preparing ${i} of ${files.length}…`);
        const { blob, contentType, ext } = await prepareForUpload(file);

        setProgress(`Uploading ${i} of ${files.length}…`);
        const path = `${slugify(identity.name)}/${Date.now()}-${cryptoRandom()}.${ext}`;

        const up = await supabase.storage.from(BUCKET).upload(path, blob, {
          contentType,
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

const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.85;

async function prepareForUpload(
  file: File,
): Promise<{ blob: Blob; contentType: string; ext: string }> {
  const fallback = {
    blob: file,
    contentType: file.type || 'image/jpeg',
    ext: (file.name.split('.').pop() || 'jpg').toLowerCase(),
  };

  if (!file.type.startsWith('image/')) return fallback;

  try {
    const compressed = await compressImage(file);
    if (compressed && compressed.size < file.size) {
      return { blob: compressed, contentType: 'image/jpeg', ext: 'jpg' };
    }
  } catch {
    // fall through to original
  }
  return fallback;
}

async function compressImage(file: File): Promise<Blob | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('image decode failed'));
      i.src = url;
    });

    const longestEdge = Math.max(img.width, img.height);
    const scale = longestEdge > MAX_EDGE ? MAX_EDGE / longestEdge : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
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
