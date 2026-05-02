'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, QrCode, Download } from 'lucide-react';
import { isAdmin, setAdmin } from '@/lib/identity';

export default function AdminPage() {
  const [code, setCode] = useState('');
  const [on, setOn] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);
  const expected = process.env.NEXT_PUBLIC_ADMIN_CODE;

  useEffect(() => {
    setOn(isAdmin());
    setQrUrl(window.location.origin);
  }, []);

  function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    if (!expected) {
      setMsg('Admin code is not configured (set NEXT_PUBLIC_ADMIN_CODE).');
      return;
    }
    if (code === expected) {
      setAdmin(true);
      setOn(true);
      setMsg('Admin mode enabled. You can now delete photos in the gallery.');
      setCode('');
    } else {
      setMsg('Wrong code.');
    }
  }

  function handleDisable() {
    setAdmin(false);
    setOn(false);
    setMsg('Admin mode disabled.');
  }

  function downloadQr() {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([xml], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedding-qr.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-md px-6 pb-28 pt-10">
      <header className="mb-6 flex items-center gap-3">
        <Shield className="text-olive-700" size={28} />
        <h1 className="font-display text-2xl text-olive-900">Admin</h1>
      </header>

      <p className="text-sm text-olive-600">
        Status:{' '}
        <span
          className={
            on ? 'font-bold text-emerald-700' : 'font-medium text-olive-700'
          }
        >
          {on ? 'Enabled on this device' : 'Disabled'}
        </span>
      </p>

      {!on ? (
        <form onSubmit={handleEnable} className="mt-6 space-y-4">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Admin code"
            autoComplete="off"
            className="w-full rounded-2xl border border-olive-200 bg-olive-50 px-4 py-4 text-lg outline-none focus:border-olive-500 focus:bg-white"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-olive-600 py-3 text-lg font-semibold text-white shadow-md active:scale-95"
          >
            Enable
          </button>
        </form>
      ) : (
        <button
          onClick={handleDisable}
          className="mt-6 w-full rounded-2xl border border-olive-400 py-3 text-lg font-semibold text-olive-700 active:scale-95"
        >
          Disable
        </button>
      )}

      {msg && <p className="mt-4 text-sm text-olive-700">{msg}</p>}

      <section className="mt-10 rounded-2xl bg-white p-5 shadow-md">
        <div className="mb-3 flex items-center gap-2">
          <QrCode size={22} className="text-olive-700" />
          <h2 className="font-display text-xl text-olive-900">Guest QR code</h2>
        </div>
        <p className="text-xs text-olive-500">
          Print this on table cards or share the screen. Scanning opens the
          link below.
        </p>

        <input
          type="url"
          value={qrUrl}
          onChange={(e) => setQrUrl(e.target.value)}
          placeholder="https://your-wedding-app.vercel.app"
          className="mt-4 w-full rounded-xl border border-olive-200 bg-olive-50 px-3 py-3 text-sm outline-none focus:border-olive-500 focus:bg-white"
        />

        <div
          ref={qrRef}
          className="mt-4 flex items-center justify-center rounded-xl bg-white p-4"
        >
          {qrUrl ? (
            <QRCodeSVG
              value={qrUrl}
              size={240}
              level="M"
              marginSize={2}
              fgColor="#3a4020"
              bgColor="#ffffff"
            />
          ) : (
            <p className="py-12 text-sm text-olive-400">Enter a URL above</p>
          )}
        </div>

        <button
          type="button"
          onClick={downloadQr}
          disabled={!qrUrl}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-olive-300 py-3 text-sm font-semibold text-olive-700 transition active:scale-95 disabled:opacity-50"
        >
          <Download size={18} />
          Download SVG
        </button>

        <p className="mt-3 text-xs text-olive-400">
          Tip: when running locally the QR points to localhost — set this to
          your deployed URL (e.g. on Vercel) before printing.
        </p>
      </section>

      <p className="mt-10 text-xs text-olive-400">
        Note: admin is a soft gate, not real auth — anyone who knows the code
        can delete photos.
      </p>
    </main>
  );
}
