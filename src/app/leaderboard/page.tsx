'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, Heart, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { useIdentity } from '@/components/IdentityProvider';
import type { RankRow } from '@/lib/types';

const LEADER_KEY = 'wedding_leader_state';

export default function LeaderboardPage() {
  const { identity } = useIdentity();
  const [paps, setPaps] = useState<RankRow[]>([]);
  const [lens, setLens] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from('paparazzi_ranking').select('*').limit(50),
      supabase.from('golden_lens_ranking').select('*').limit(50),
    ]);
    setPaps((a.data ?? []) as RankRow[]);
    setLens((b.data ?? []) as RankRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('leaderboard-feed')
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

  useEffect(() => {
    if (loading) return;

    const isPhotosLeader = paps[0]?.id === identity.id;
    const isLikesLeader = lens[0]?.id === identity.id;

    let prev = { photos: false, likes: false };
    try {
      const raw = localStorage.getItem(LEADER_KEY);
      if (raw) prev = JSON.parse(raw);
    } catch {
      // ignore
    }

    const justTookPhotos = isPhotosLeader && !prev.photos;
    const justTookLikes = isLikesLeader && !prev.likes;

    if (justTookPhotos || justTookLikes) {
      let msg: string;
      if (justTookPhotos && justTookLikes) {
        msg = "You're leading both rankings!";
      } else if (justTookPhotos) {
        msg = "You're leading on photos uploaded!";
      } else {
        msg = "You're leading on likes received!";
      }
      setCelebration(msg);
      fireConfetti();
    }

    localStorage.setItem(
      LEADER_KEY,
      JSON.stringify({ photos: isPhotosLeader, likes: isLikesLeader }),
    );
  }, [paps, lens, loading, identity.id]);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center gap-3 px-2">
        <Trophy className="text-amber-500" size={32} />
        <h1 className="font-display text-3xl text-olive-900">Leaderboard</h1>
      </header>

      {loading ? (
        <p className="py-12 text-center text-olive-400">Loading…</p>
      ) : (
        <>
          <Section
            subtitle="Most photos uploaded"
            icon={<Camera size={20} />}
            rows={paps}
            valueKey="photo_count"
            meId={identity.id}
            accent="bg-olive-100 text-olive-700"
          />
          <Section
            subtitle="Most likes received"
            icon={<Heart size={20} />}
            rows={lens}
            valueKey="like_count"
            meId={identity.id}
            accent="bg-amber-100 text-amber-700"
          />
        </>
      )}

      {celebration && (
        <CelebrationOverlay
          message={celebration}
          onDismiss={() => setCelebration(null)}
        />
      )}
    </main>
  );
}

function Section({
  subtitle,
  icon,
  rows,
  valueKey,
  meId,
  accent,
}: {
  subtitle: string;
  icon: React.ReactNode;
  rows: RankRow[];
  valueKey: 'photo_count' | 'like_count';
  meId: string;
  accent: string;
}) {
  return (
    <section className="mb-6 rounded-2xl bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center gap-3">
        <span className={`rounded-full p-2 ${accent}`}>{icon}</span>
        <h2 className="font-display text-lg text-olive-900">{subtitle}</h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-olive-400">
          No data yet.
        </p>
      ) : (
        <ol className="divide-y divide-olive-100">
          {rows.map((r, i) => {
            const isMe = r.id === meId;
            return (
              <li
                key={r.id}
                className={`flex items-center justify-between gap-3 px-2 py-3 ${
                  isMe ? 'rounded-lg bg-amber-50/60' : ''
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankBadge(
                      i,
                    )}`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`truncate ${
                      isMe
                        ? 'font-bold text-olive-900'
                        : 'font-medium text-olive-900'
                    }`}
                  >
                    {r.name}
                    {isMe && (
                      <span className="ml-2 text-xs font-semibold text-amber-700">
                        you
                      </span>
                    )}
                  </span>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums text-olive-700">
                  {(r[valueKey] ?? 0) as number}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function CelebrationOverlay({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6 backdrop-blur-sm"
    >
      <div className="animate-pop-in max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-amber-100">
          <Trophy size={56} className="text-amber-500" />
        </div>
        <h2 className="mt-5 font-display text-3xl text-olive-900">
          You took the lead!
        </h2>
        <p className="mt-2 text-olive-700">{message}</p>
        <p className="mt-6 text-xs text-olive-400">tap to dismiss</p>
      </div>
    </div>
  );
}

function fireConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;
  const colors = ['#a8b549', '#6c7d28', '#fbbf24', '#f59e0b', '#fef3c7'];

  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.5 },
    colors,
  });

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

function rankBadge(i: number) {
  if (i === 0) return 'bg-amber-400 text-white';
  if (i === 1) return 'bg-zinc-300 text-white';
  if (i === 2) return 'bg-amber-700 text-white';
  return 'bg-olive-100 text-olive-700';
}
