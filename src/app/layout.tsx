import type { Metadata, Viewport } from 'next';
import './globals.css';
import { IdentityProvider } from '@/components/IdentityProvider';
import { BottomNav } from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'Wedding Photos',
  description: 'Share & celebrate the day',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f7f8ed',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-olive-50 text-olive-900 antialiased">
        <IdentityProvider>
          {children}
          <BottomNav />
        </IdentityProvider>
      </body>
    </html>
  );
}
