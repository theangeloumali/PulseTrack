import {Geist, Geist_Mono} from 'next/font/google';
import {Analytics} from '@vercel/analytics/next';
import '@workspace/ui/globals.css';
import {Providers} from '@/components/providers';
import type {Metadata, Viewport} from 'next';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1f2937',
};

export const metadata: Metadata = {
  title: 'PulseTrack - Project Management & Time Tracking',
  description:
    'Comprehensive project management system with ticket tracking, time management, and billing features.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PulseTrack',
  },
  icons: {
    icon: [
      {url: '/icon.png', sizes: '32x32', type: 'image/png'},
      {url: '/app-logo.png', sizes: '512x512', type: 'image/png'},
    ],
    shortcut: '/icon.png',
    apple: '/app-logo.png',
  },
};

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}>
        <Analytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
