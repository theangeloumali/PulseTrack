'use client';

import {useEffect, useState} from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PWAInstaller() {
  const [isInstallPromptVisible, setIsInstallPromptVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', {scope: '/'})
        .then((registration) => {
          console.log('✅ PWA: Service Worker registered successfully', registration);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log(
                    '🔄 PWA: New content is available, will be used when all tabs are closed',
                  );
                  // You could show a notification here about new content
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ PWA: Service Worker registration failed', error);
        });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallPromptVisible(true);
      console.log('📱 PWA: Install prompt ready');
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      console.log('🎉 PWA: App was installed successfully');
      setIsInstalled(true);
      setIsInstallPromptVisible(false);
      setDeferredPrompt(null);
    };

    // Check if already installed
    const checkIfInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        console.log('📱 PWA: App is running in standalone mode');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    checkIfInstalled();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const {outcome} = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ PWA: User accepted the install prompt');
      } else {
        console.log('❌ PWA: User dismissed the install prompt');
      }

      setDeferredPrompt(null);
      setIsInstallPromptVisible(false);
    } catch (error) {
      console.error('❌ PWA: Error showing install prompt', error);
    }
  };

  const handleDismissInstall = () => {
    setIsInstallPromptVisible(false);
    setDeferredPrompt(null);
  };

  // Only show install prompt if not already installed and prompt is available
  if (isInstalled || !isInstallPromptVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-900 dark:bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-gray-900 text-lg">📱</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Install PulseTrack
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Add to your home screen for quick access and offline use
            </p>
          </div>
        </div>

        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors">
            Install
          </button>
          <button
            onClick={handleDismissInstall}
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
