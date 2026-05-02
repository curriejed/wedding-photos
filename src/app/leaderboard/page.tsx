'use client';

import { useEffect, useState } from 'react';
import { Camera, Heart, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { RankRow } from '@/lib/types';

export default function LeaderboardPage() {
  const [paps, setPaps] = useState<RankRow[]>([]);
  const [lens, setLens] = useState<RankRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([
        supabase.from('paparazzi_ranking').select('*').limit(50),
        supabase.from('golden_lens_ranking').select('*').limit(50),
      ]);
      setPaps((a.data ?? []) as RankRow[]);
      setLens((b.data ?? []) as RankRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center gap-3 px-2">
        <Trophy className="text-amber-500" size={32} />
        <h1 className="font-display text-3xl text-olive-900">Leaders</h1>
      </header>

      {loading ? (
        <p className="py-12 text-center text-olive-400">Loading…</p>
      ) : (
        <>
          <Section
            title="The Paparazzi"
            subtitle="Most photos uploaded"
            icon={<Camera size={20} />}
            rows={paps}
            valueKey="photo_count"
            accent="bg-olive-100 text-olive-700"
          />
          <Section
            title="The Showstoppers"
            subtitle="Most likes received"
            icon={<Heart size={20} />}
            rows={lens}
            valueKey="like_count"
            accent="bg-amber-100 text-amber-700"
          />
        </>
      )}
    </main>
  );
}

function Section({
  title,
  subtitle,
  icon,
  rows,
  valueKey,
  accent,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: RankRow[];
  valueKey: 'photo_count' | 'like_count';
  accent: string;
}) {
  return (
    <section className="mb-6 rounded-2xl bg-white p-4 shadow-md">
      <div className="mb-3 flex items-center gap-3">
        <span className={`rounded-full p-2 ${accent}`}>{icon}</span>
        <div>
          <h2 className="font-display text-xl text-olive-900">{title}</h2>
          <p className="text-xs text-olive-500">{subtitle}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm text-olive-400">
          No data yet.
        </p>
      ) : (
        <ol className="divide-y divide-olive-100">
          {rows.map((r, i) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 px-2 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankBadge(
                    i,
                  )}`}
                >
                  {i + 1}
                </span>
                <span className="truncate font-medium text-olive-900">
                  {r.name}
                </span>
              </div>
              <span className="shrink-0 text-lg font-bold tabular-nums text-olive-700">
                {(r[valueKey] ?? 0) as number}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function rankBadge(i: number) {
  if (i === 0) return 'bg-amber-400 text-white';
  if (i === 1) return 'bg-zinc-300 text-white';
  if (i === 2) return 'bg-amber-700 text-white';
  return 'bg-olive-100 text-olive-700';
}
