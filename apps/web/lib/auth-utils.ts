/**
 * Auth cleanup utility to handle corrupted auth states
 */

export const clearAuthState = () => {
  if (typeof window === 'undefined') return;
  
  console.log('🧹 Clearing corrupted auth state...');
  
  // Clear localStorage
  const authKeys = [
    'sb-bqqosmjptqtivinrcfhn-auth-token',
    'supabase.auth.token',
    'currentUser'
  ];
  
  authKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log('🧹 Cleared localStorage key:', key);
    } catch (error) {
      console.warn('🧹 Failed to clear localStorage key:', key, error);
    }
  });
  
  // Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log('🧹 Cleared sessionStorage');
  } catch (error) {
    console.warn('🧹 Failed to clear sessionStorage:', error);
  }
  
  console.log('🧹 Auth state cleanup complete');
};

export const isRefreshTokenError = (error: any): boolean => {
  const errorMessage = error?.message || '';
  return errorMessage.includes('refresh_token_not_found') || 
         errorMessage.includes('Invalid Refresh Token') ||
         errorMessage.includes('refresh token not found');
};
