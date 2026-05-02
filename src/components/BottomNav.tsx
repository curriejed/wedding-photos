'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Image as ImageIcon, Camera, Trophy } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Gallery', icon: ImageIcon },
  { href: '/upload', label: 'Upload', icon: Camera },
  { href: '/leaderboard', label: 'Leaders', icon: Trophy },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-olive-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-2xl">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs transition ${
                active ? 'text-olive-700' : 'text-olive-400'
              }`}
            >
              <Icon size={26} strokeWidth={active ? 2.5 : 2} />
              <span className={active ? 'font-semibold' : ''}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
