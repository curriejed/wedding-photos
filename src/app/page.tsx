'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useIdentity } from '@/components/IdentityProvider';
import { PhotoCard } from '@/components/PhotoCard';
import { isAdmin } from '@/lib/identity';
import type { PhotoWithStats } from '@/lib/types';

export default function HomePage() {
  const { identity } = useIdentity();
  const [photos, setPhotos] = useState<PhotoWithStats[]>([]);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [admin, setAdminState] = useState(false);

  useEffect(() => setAdminState(isAdmin()), []);

  const load = useCallback(async () => {
    const [photosRes, likesRes] = await Promise.all([
      supabase
        .from('photos_with_stats')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase.from('likes').select('photo_id').eq('user_id', identity.id),
    ]);
    setPhotos((photosRes.data ?? []) as PhotoWithStats[]);
    setMyLikes(new Set((likesRes.data ?? []).map((l: any) => l.photo_id as string)));
    setLoading(false);
  }, [identity.id]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('public-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'photos' },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <main className="mx-auto max-w-2xl px-3 pb-28 pt-6">
      <header className="mb-5 px-2">
        <h1 className="font-display text-3xl text-olive-900">Wedding Gallery</h1>
        <p className="text-sm text-olive-500">
          Hi {identity.name} — tap the heart to like.
        </p>
      </header>

      {loading ? (
        <p className="py-12 text-center text-olive-400">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="py-12 text-center text-olive-400">
          No photos yet — be the first to share one.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              liked={myLikes.has(p.id)}
              myId={identity.id}
              admin={admin}
              onChange={load}
            />
          ))}
        </div>
      )}
    </main>
  );
}
