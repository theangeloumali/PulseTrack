'use client';

import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {ReactQueryDevtools} from '@tanstack/react-query-devtools';
import {useState} from 'react';
import type {ReactElement} from 'react';

export function QueryProvider({children}: {children: React.ReactNode}): ReactElement {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 2, // 2 minutes (reduced from 5)
            gcTime: 1000 * 60 * 10, // 10 minutes (renamed from cacheTime)
            refetchOnWindowFocus: true, // Enable refetch on window focus/tab switch
            refetchOnMount: true, // Always refetch when component mounts
            refetchOnReconnect: true, // Refetch when internet reconnects
            retry: (failureCount, error: any) => {
              // Don't retry on 401/403 errors
              if (error?.status === 401 || error?.status === 403) {
                return false;
              }
              return failureCount < 3;
            },
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
