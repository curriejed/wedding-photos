'use client';

import { Check, ChevronDown, Search, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  people: string[];
  value: string | null;
  onChange: (next: string | null) => void;
};

export function PhotographerFilter({ people, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 50);

    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.toLowerCase().includes(q));
  }, [people, query]);

  function pick(name: string | null) {
    onChange(name);
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-olive-200 bg-white px-4 py-3 text-left text-sm shadow-sm transition active:scale-[0.99]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2 text-olive-800">
          <Users size={18} className="shrink-0 text-olive-500" />
          <span className="truncate">
            {value ? (
              <>
                <span className="text-olive-500">By</span>{' '}
                <span className="font-semibold">{value}</span>
              </>
            ) : (
              'All photographers'
            )}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {value && (
            <span
              role="button"
              aria-label="Clear filter"
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
              }}
              className="rounded-full p-1 text-olive-400 active:bg-olive-100"
            >
              <X size={16} />
            </span>
          )}
          <ChevronDown
            size={18}
            className={`text-olive-500 transition ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-olive-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-olive-100 px-3 py-2">
            <Search size={16} className="shrink-0 text-olive-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a guest…"
              className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-olive-400"
            />
          </div>

          <ul
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            <li>
              <button
                type="button"
                onClick={() => pick(null)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-olive-50 active:bg-olive-100"
              >
                <span className="text-olive-700">All photographers</span>
                {value === null && (
                  <Check size={16} className="text-olive-600" />
                )}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-center text-sm text-olive-400">
                No matches
              </li>
            ) : (
              filtered.map((p) => (
                <li key={p}>
                  <button
                    type="button"
                    onClick={() => pick(p)}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-olive-50 active:bg-olive-100"
                  >
                    <span className="truncate text-olive-900">{p}</span>
                    {value === p && (
                      <Check size={16} className="shrink-0 text-olive-600" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
