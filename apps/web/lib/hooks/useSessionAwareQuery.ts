import {useQuery, UseQueryOptions, QueryKey, QueryFunction} from '@tanstack/react-query';
import {ensureValidSessionForQuery, handleQueryError} from '@/lib/session-manager';

interface SessionAwareQueryOptions<
  TQueryFnData,
  TError,
  TData,
  TQueryKey extends QueryKey,
> extends UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> {
  // Additional options can be added here if needed
}

/**
 * A wrapper around useQuery that includes session management
 * This ensures the session is valid before making requests and handles session expiry
 */
export function useSessionAwareQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(options: SessionAwareQueryOptions<TQueryFnData, TError, TData, TQueryKey>) {
  const originalQueryFn = options.queryFn as QueryFunction<TQueryFnData, TQueryKey>;

  return useQuery({
    ...options,
    queryFn: async (context) => {
      // Ensure session is valid before making the request
      const sessionValid = await ensureValidSessionForQuery();
      if (!sessionValid) {
        throw new Error('Session expired or invalid');
      }

      // Call the original query function
      if (!originalQueryFn) {
        throw new Error('Query function is required');
      }

      try {
        return await originalQueryFn(context);
      } catch (error: any) {
        // Handle potential session errors
        const refreshed = await handleQueryError(error);
        if (refreshed) {
          // Retry the request with refreshed session
          return await originalQueryFn(context);
        }
        // Re-throw the error if it's not session-related or refresh failed
        throw error;
      }
    },
    retry: (failureCount, error: any) => {
      // Only give up on confirmed auth errors, be more resilient for other errors
      const isConfirmedAuthError =
        error?.message?.includes('Session expired') ||
        error?.message?.includes('invalid JWT') ||
        error?.message?.includes('JWT expired') ||
        (error?.status === 401 && error?.message?.includes('JWT')) ||
        (error?.status === 403 && error?.message?.includes('JWT'));

      if (isConfirmedAuthError) {
        console.log('Confirmed auth error, not retrying:', error);
        return false;
      }

      // For network errors or other 401/403s, allow retries
      if (error?.status === 401 || error?.status === 403) {
        console.log(
          `Retrying ${error?.status} error (attempt ${failureCount + 1}):`,
          error?.message,
        );
        return failureCount < 2; // Allow 2 retries for potential network issues
      }

      // Use original retry logic or default
      if (options.retry !== undefined) {
        if (typeof options.retry === 'function') {
          return options.retry(failureCount, error);
        }
        if (typeof options.retry === 'boolean') {
          return options.retry;
        }
        if (typeof options.retry === 'number') {
          return failureCount < options.retry;
        }
      }

      // Default retry logic - be more generous with retries
      return failureCount < 3;
    },
    retryDelay: (attemptIndex, error) => {
      // Use original retry delay logic or default
      if (options.retryDelay) {
        if (typeof options.retryDelay === 'function') {
          return options.retryDelay(attemptIndex, error);
        }
        return options.retryDelay;
      }

      // Default exponential backoff
      return Math.min(1000 * 2 ** attemptIndex, 30000);
    },
  });
}
