'use client';

import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { PhotoWithStats } from '@/lib/types';

export function PhotoViewer({
  photo,
  onClose,
}: {
  photo: PhotoWithStats;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function handleDownload() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const filename = filenameFor(photo);
      const res = await fetch(photo.public_url);
      const blob = await res.blob();

      if (typeof navigator !== 'undefined' && 'canShare' in navigator) {
        try {
          const file = new File([blob], filename, { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file] });
            setBusy(false);
            return;
          }
        } catch {
          // user cancelled the share sheet, or share unavailable — fall through
        }
      }

      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      setMsg('Download failed. Try long-pressing the image to save.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <header
        className="flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 text-white">
          <p className="truncate text-sm font-semibold">{photo.user_name}</p>
          <p className="truncate text-xs text-white/60">
            {new Date(photo.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="rounded-full bg-white/10 p-3 text-white transition active:scale-90 disabled:opacity-50"
            aria-label="Download photo"
          >
            {busy ? (
              <span className="block h-[22px] w-[22px] animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Download size={22} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-3 text-white transition active:scale-90"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>
      </header>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <TransformWrapper
          minScale={1}
          maxScale={6}
          initialScale={1}
          centerOnInit
          wheel={{ step: 0.15 }}
          doubleClick={{ step: 1.8, mode: 'toggle' }}
          panning={{ velocityDisabled: true }}
        >
          <TransformComponent
            wrapperStyle={{ width: '100%', height: '100%' }}
            contentStyle={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.public_url}
              alt={`Photo by ${photo.user_name}`}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
          </TransformComponent>
        </TransformWrapper>
      </div>

      {msg && (
        <p className="px-6 pb-2 text-center text-sm text-white/80">{msg}</p>
      )}
      <p className="px-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-xs text-white/50">
        Pinch or double-tap to zoom · tap outside to close
      </p>
    </div>
  );
}

function filenameFor(photo: PhotoWithStats): string {
  const ext = (photo.storage_path.split('.').pop() || 'jpg').toLowerCase();
  const slug =
    photo.user_name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .toLowerCase()
      .replace(/^-+|-+$/g, '') || 'guest';
  return `wedding-${slug}-${photo.id.slice(0, 8)}.${ext}`;
}
