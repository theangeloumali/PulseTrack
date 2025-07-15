import {create} from 'zustand';
import {persist} from 'zustand/middleware';

interface ResetPasswordState {
  isPasswordResetFlow: boolean;
  resetEmail: string;
  resetTimestamp: number;

  // Actions
  setPasswordResetFlow: (email: string) => void;
  clearPasswordResetFlow: () => void;
  isValidResetFlow: () => boolean;
}

export const useResetPasswordStore = create<ResetPasswordState>()(
  persist(
    (set, get) => ({
      isPasswordResetFlow: false,
      resetEmail: '',
      resetTimestamp: 0,

      setPasswordResetFlow: (email: string) => {
        console.log('🔄 Reset Store: Setting password reset flow for:', email);
        set({
          isPasswordResetFlow: true,
          resetEmail: email,
          resetTimestamp: Date.now(),
        });
      },

      clearPasswordResetFlow: () => {
        console.log('🔄 Reset Store: Clearing password reset flow');
        set({
          isPasswordResetFlow: false,
          resetEmail: '',
          resetTimestamp: 0,
        });
      },

      isValidResetFlow: () => {
        const state = get();
        if (!state.isPasswordResetFlow) return false;

        // Reset flow is valid for 10 minutes
        const tenMinutes = 10 * 60 * 1000;
        const isExpired = Date.now() - state.resetTimestamp > tenMinutes;

        if (isExpired) {
          console.log('🔄 Reset Store: Reset flow expired, clearing');
          set({
            isPasswordResetFlow: false,
            resetEmail: '',
            resetTimestamp: 0,
          });
          return false;
        }

        return true;
      },
    }),
    {
      name: 'reset-password-storage',
      partialize: (state) => ({
        isPasswordResetFlow: state.isPasswordResetFlow,
        resetEmail: state.resetEmail,
        resetTimestamp: state.resetTimestamp,
      }),
    },
  ),
);
