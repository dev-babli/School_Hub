import React, { ReactNode } from 'react';
import { DM_Sans } from 'next/font/google';
import 'styles/globals-tailwind.css';
import 'styles/App.css';
import 'styles/Contact.css';
import AppWrappers from './AppWrappers';
import type { Metadata, Viewport } from 'next';

const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  title: 'Dashboard',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/logo192.png',
    shortcut: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body id="root" className={dmSans.className} suppressHydrationWarning>
        <AppWrappers>{children}</AppWrappers>
      </body>
    </html>
  );
}
