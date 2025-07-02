'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface AutoRefreshProps {
  queryKeys?: string[][];
  disabled?: boolean;
}

/**
 * Component that automatically refreshes specific queries when the tab becomes visible
 * This ensures data stays fresh when users switch between tabs
 */
export function AutoRefresh({ queryKeys, disabled = false }: AutoRefreshProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (disabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Tab became visible, refreshing data...');
        
        if (queryKeys && queryKeys.length > 0) {
          // Refetch specific query keys
          queryKeys.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey });
          });
        } else {
          // Refetch all queries if no specific keys provided
          queryClient.invalidateQueries();
        }
      }
    };

    const handleFocus = () => {
      if (queryKeys && queryKeys.length > 0) {
        console.log('🔄 Window focused, refreshing specific data...');
        queryKeys.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    };

    // Listen for visibility change (tab switching)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus (clicking on browser window)
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [queryClient, queryKeys, disabled]);

  return null; // This component doesn't render anything
}