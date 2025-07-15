'use client';

import {useEffect} from 'react';
import {sessionManager} from '@/lib/session-manager';

export function SessionInitializer() {
  useEffect(() => {
    // Session manager is already initialized when imported
    // This component just ensures cleanup on unmount
    return () => {
      sessionManager.cleanup();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
