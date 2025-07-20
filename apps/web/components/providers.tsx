'use client';

import * as React from 'react';
import {ThemeProvider as NextThemesProvider} from 'next-themes';
import {AuthGate} from './auth-gate';
import {QueryProvider} from './query-provider';
import {SidebarLayout} from './sidebar-layout';
import {ThemeProvider} from './theme-provider';
import {SessionInitializer} from './session-initializer';
import {PWAInstaller} from './pwa-installer';

export function Providers({children}: {children: React.ReactNode}) {
  return (
    <QueryProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange={false}
        enableColorScheme>
        <ThemeProvider />
        <SessionInitializer />
        <PWAInstaller />
        <AuthGate>
          <SidebarLayout>{children}</SidebarLayout>
        </AuthGate>
      </NextThemesProvider>
    </QueryProvider>
  );
}
