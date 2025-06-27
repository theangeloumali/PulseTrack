'use client';

import { useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Props {
	params: Promise<{
		id: string; // project ID
	}>;
}

// This page redirects to the project page with the ticket creation modal
// We're moving away from separate pages to modal-based forms for better UX
export default function NewTicketPage({ params }: Props) {
	const resolvedParams = use(params);
	const router = useRouter();

	useEffect(() => {
		// Redirect to project page where the ticket creation modal can be triggered
		// The sidebar already has the "New Ticket" button that opens the modal
		router.replace(`/projects/${resolvedParams.id}?openCreateTicket=true`);
	}, [resolvedParams.id, router]);

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center">
			<div className="text-center">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
				<p className="mt-2 text-gray-600">Redirecting to project...</p>
			</div>
		</div>
	);
}
