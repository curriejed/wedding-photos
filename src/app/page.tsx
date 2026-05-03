'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useIdentity } from '@/components/IdentityProvider';
import { PhotoCard } from '@/components/PhotoCard';
import { PhotoViewer } from '@/components/PhotoViewer';
import { PhotographerFilter } from '@/components/PhotographerFilter';
import { isAdmin } from '@/lib/identity';
import type { PhotoWithStats } from '@/lib/types';

type SortMode = 'new' | 'liked';

export default function HomePage() {
  const { identity } = useIdentity();
  const [photos, setPhotos] = useState<PhotoWithStats[]>([]);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [admin, setAdminState] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('new');
  const [filterPerson, setFilterPerson] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<PhotoWithStats | null>(null);

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

  const people = useMemo(() => {
    const names = new Set(photos.map((p) => p.user_name));
    return Array.from(names).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    );
  }, [photos]);

  const visible = useMemo(() => {
    let arr = filterPerson
      ? photos.filter((p) => p.user_name === filterPerson)
      : [...photos];

    if (sortMode === 'liked') {
      arr.sort((a, b) => {
        if (b.like_count !== a.like_count) return b.like_count - a.like_count;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      arr.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return arr;
  }, [photos, sortMode, filterPerson]);

  return (
    <main className="mx-auto max-w-2xl px-3 pb-28 pt-6">
      <header className="mb-4 px-2">
        <h1 className="font-display text-3xl text-olive-900">Wedding Gallery</h1>
        <p className="text-sm text-olive-500">
          Hi {identity.name} — tap the heart to like.
        </p>
      </header>

      <div className="mb-3 px-1">
        <PhotographerFilter
          people={people}
          value={filterPerson}
          onChange={setFilterPerson}
        />
      </div>

      <div
        className="mb-4 inline-flex w-full max-w-xs rounded-full bg-olive-100 p-1 text-sm font-semibold"
        role="tablist"
        aria-label="Sort gallery"
      >
        <SortTab
          active={sortMode === 'new'}
          onClick={() => setSortMode('new')}
          label="New"
        />
        <SortTab
          active={sortMode === 'liked'}
          onClick={() => setSortMode('liked')}
          label="Most Liked"
        />
      </div>

      {loading ? (
        <p className="py-12 text-center text-olive-400">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="py-12 text-center text-olive-400">
          {filterPerson
            ? `No photos by ${filterPerson} yet.`
            : 'No photos yet — be the first to share one.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {visible.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              liked={myLikes.has(p.id)}
              myId={identity.id}
              admin={admin}
              onChange={load}
              onView={() => setViewerPhoto(p)}
            />
          ))}
        </div>
      )}

      {viewerPhoto && (
        <PhotoViewer
          photo={viewerPhoto}
          onClose={() => setViewerPhoto(null)}
        />
      )}
    </main>
  );
}

function SortTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-full px-4 py-2 transition ${
        active
          ? 'bg-white text-olive-800 shadow-sm'
          : 'text-olive-600 active:bg-olive-200'
      }`}
    >
      {label}
    </button>
  );
}
