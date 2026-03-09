import React, { ReactNode } from 'react';
import AppWrappers from './AppWrappers';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  manifest: '/manifest.json',
  icons: {
    icon: (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/favicon.ico',
    apple: '/logo192.png',
    shortcut: (process.env.NEXT_PUBLIC_BASE_PATH || '') + '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body id={'root'}>
        <AppWrappers>{children}</AppWrappers>
      </body>
    </html>
  );
}
