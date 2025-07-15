import {create} from 'zustand';
import {persist} from 'zustand/middleware';

interface AccountSetupState {
  isAccountSetupFlow: boolean;
  setupEmail: string;
  setupTimestamp: number;

  // Actions
  setAccountSetupFlow: (email: string) => void;
  clearAccountSetupFlow: () => void;
  isValidSetupFlow: () => boolean;
}

export const useAccountSetupStore = create<AccountSetupState>()(
  persist(
    (set, get) => ({
      isAccountSetupFlow: false,
      setupEmail: '',
      setupTimestamp: 0,

      setAccountSetupFlow: (email: string) => {
        console.log('🔄 Setup Store: Setting account setup flow for:', email);
        set({
          isAccountSetupFlow: true,
          setupEmail: email,
          setupTimestamp: Date.now(),
        });
      },

      clearAccountSetupFlow: () => {
        console.log('🔄 Setup Store: Clearing account setup flow');
        set({
          isAccountSetupFlow: false,
          setupEmail: '',
          setupTimestamp: 0,
        });
      },

      isValidSetupFlow: () => {
        const state = get();
        if (!state.isAccountSetupFlow) return false;

        // Setup flow is valid for 30 minutes
        const thirtyMinutes = 30 * 60 * 1000;
        const isExpired = Date.now() - state.setupTimestamp > thirtyMinutes;

        if (isExpired) {
          console.log('🔄 Setup Store: Setup flow expired, clearing');
          set({
            isAccountSetupFlow: false,
            setupEmail: '',
            setupTimestamp: 0,
          });
          return false;
        }

        return true;
      },
    }),
    {
      name: 'account-setup-storage',
      partialize: (state) => ({
        isAccountSetupFlow: state.isAccountSetupFlow,
        setupEmail: state.setupEmail,
        setupTimestamp: state.setupTimestamp,
      }),
    },
  ),
);
