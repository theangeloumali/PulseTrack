"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { AuthInitializer } from "./auth-initializer"
import { QueryProvider } from "./query-provider"
import { SidebarLayout } from "./sidebar-layout"
import { ThemeProvider } from "./theme-provider"
import { SessionInitializer } from "./session-initializer"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange={false}
        enableColorScheme
      >
        <ThemeProvider />
        <AuthInitializer />
        <SessionInitializer />
        <SidebarLayout>
          {children}
        </SidebarLayout>
      </NextThemesProvider>
    </QueryProvider>
  )
}
