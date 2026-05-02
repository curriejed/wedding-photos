'use client';

import { Heart, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { supabase, BUCKET } from '@/lib/supabase';
import type { PhotoWithStats } from '@/lib/types';

type Props = {
  photo: PhotoWithStats;
  liked: boolean;
  myId: string;
  admin: boolean;
  onChange: () => void;
};

export function PhotoCard({ photo, liked, myId, admin, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [optimisticLiked, setOptimisticLiked] = useState(liked);
  const [optimisticCount, setOptimisticCount] = useState(photo.like_count);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);

    const next = !optimisticLiked;
    setOptimisticLiked(next);
    setOptimisticCount((c) => c + (next ? 1 : -1));

    try {
      if (next) {
        const { error } = await supabase
          .from('likes')
          .insert({ photo_id: photo.id, user_id: myId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ photo_id: photo.id, user_id: myId });
        if (error) throw error;
      }
      onChange();
    } catch {
      setOptimisticLiked(!next);
      setOptimisticCount((c) => c + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this photo? This cannot be undone.')) return;
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    await supabase.from('photos').delete().eq('id', photo.id);
    onChange();
  }

  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-md">
      <div className="relative aspect-square w-full bg-olive-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.public_url}
          alt={`Photo by ${photo.user_name}`}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-olive-900">
            {photo.user_name}
          </p>
          <p className="truncate text-xs text-olive-400">
            {new Date(photo.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {admin && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-full p-3 text-olive-400 transition active:scale-90 active:bg-olive-100"
              aria-label="Delete photo"
            >
              <Trash2 size={20} />
            </button>
          )}
          <button
            type="button"
            onClick={toggleLike}
            disabled={busy}
            className="flex items-center gap-1 rounded-full px-3 py-2 text-rose-600 transition active:scale-90 disabled:opacity-60"
            aria-label={optimisticLiked ? 'Unlike' : 'Like'}
            aria-pressed={optimisticLiked}
          >
            <Heart
              size={26}
              fill={optimisticLiked ? 'currentColor' : 'none'}
              strokeWidth={2}
            />
            <span className="min-w-[1.25rem] text-sm font-semibold tabular-nums">
              {optimisticCount}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
