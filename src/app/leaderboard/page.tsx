'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Heart,
  Minus,
  Trophy,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { supabase } from '@/lib/supabase';
import { useIdentity } from '@/components/IdentityProvider';
import type { RankRow } from '@/lib/types';

const LEADER_KEY = 'wedding_leader_state';
const POS_KEY = 'wedding_position_state';

type PosState = { photos: number | null; likes: number | null };

export default function LeaderboardPage() {
  const { identity } = useIdentity();
  const [paps, setPaps] = useState<RankRow[]>([]);
  const [lens, setLens] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [prevPos, setPrevPos] = useState<PosState>({ photos: null, likes: null });
  const lastSeenRef = useRef<PosState>({ photos: null, likes: null });

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from('paparazzi_ranking').select('*'),
      supabase.from('golden_lens_ranking').select('*'),
    ]);
    setPaps((a.data ?? []) as RankRow[]);
    setLens((b.data ?? []) as RankRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) setPrevPos(JSON.parse(raw));
    } catch {
      // ignore
    }
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

  const myPhotosPos = useMemo(() => {
    const idx = paps.findIndex((r) => r.id === identity.id);
    return idx >= 0 ? idx + 1 : null;
  }, [paps, identity.id]);

  const myLikesPos = useMemo(() => {
    const idx = lens.findIndex((r) => r.id === identity.id);
    return idx >= 0 ? idx + 1 : null;
  }, [lens, identity.id]);

  useEffect(() => {
    lastSeenRef.current = { photos: myPhotosPos, likes: myLikesPos };
  }, [myPhotosPos, myLikesPos]);

  useEffect(() => {
    return () => {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(lastSeenRef.current));
      } catch {
        // ignore
      }
    };
  }, []);

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

  const photosDelta = computeDelta(prevPos.photos, myPhotosPos);
  const likesDelta = computeDelta(prevPos.likes, myLikesPos);

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
            myDelta={photosDelta}
            accent="bg-olive-100 text-olive-700"
          />
          <Section
            subtitle="Most likes received"
            icon={<Heart size={20} />}
            rows={lens}
            valueKey="like_count"
            meId={identity.id}
            myDelta={likesDelta}
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

function computeDelta(prev: number | null, current: number | null): number | null {
  if (prev === null || current === null) return null;
  return prev - current;
}

function Section({
  subtitle,
  icon,
  rows,
  valueKey,
  meId,
  myDelta,
  accent,
}: {
  subtitle: string;
  icon: React.ReactNode;
  rows: RankRow[];
  valueKey: 'photo_count' | 'like_count';
  meId: string;
  myDelta: number | null;
  accent: string;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center gap-3">
        <span className={`rounded-full p-2 ${accent}`}>{icon}</span>
        <h2 className="font-display text-lg text-olive-900">{subtitle}</h2>
      </div>

      {rows.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-olive-400">
          No data yet.
        </p>
      ) : (
        <ol className="-mx-1 max-h-[26rem] divide-y divide-olive-100 overflow-y-auto px-1">
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
                    className={`min-w-0 flex-1 truncate ${
                      isMe
                        ? 'font-bold text-olive-900'
                        : 'font-medium text-olive-900'
                    }`}
                  >
                    {r.name}
                    {isMe && (
                      <>
                        <span className="ml-2 text-xs font-semibold text-amber-700">
                          you
                        </span>
                        {myDelta !== null && <DeltaBadge delta={myDelta} />}
                      </>
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

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0) {
    return (
      <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700 align-middle">
        <ArrowUp size={12} strokeWidth={3} />
        {delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-700 align-middle">
        <ArrowDown size={12} strokeWidth={3} />
        {Math.abs(delta)}
      </span>
    );
  }
  return (
    <span className="ml-2 inline-flex items-center rounded-full bg-olive-100 px-1.5 py-0.5 text-xs font-bold text-olive-500 align-middle">
      <Minus size={12} strokeWidth={3} />
    </span>
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
