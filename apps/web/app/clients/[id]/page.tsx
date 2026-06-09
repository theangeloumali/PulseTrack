'use client';

import {useParams} from 'next/navigation';
import {ClientDetailScreen} from '@/screens/client-detail';

export default function Page() {
  const params = useParams();
  const clientId = params.id as string;

  return <ClientDetailScreen clientId={clientId} />;
}
