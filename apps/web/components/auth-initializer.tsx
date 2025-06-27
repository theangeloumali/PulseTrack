'use client';

import { useEffect, useState } from 'react';

export function AuthInitializer() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		if (mounted && typeof window !== 'undefined') {
			// Dynamically import the auth store only on the client
			import('@/lib/stores/auth').then(({ useAuthStore }) => {
				const initialize = useAuthStore.getState().initialize;
				initialize();
			});
		}
	}, [mounted]);

	return null;
}
