import { NextRequest, NextResponse } from 'next/server';
import { getCompanyBillingSettings, updateCompanyBillingSettings } from '@/lib/db/billing-service';
import { withAuth } from '@/lib/auth-utils';

async function handler(req: NextRequest, { params }: { params: { companyId: string } }) {
    const { companyId } = params;

    if (req.method === 'GET') {
        try {
            const settings = await getCompanyBillingSettings(companyId);
            return NextResponse.json(settings);
        } catch (_error: unknown) {
            return NextResponse.json({ error: (_error as Error).message || 'Failed to fetch billing settings' }, { status: 500 });
        }
    }

    if (req.method === 'PUT') {
        try {
            const body = await req.json();
            const updatedSettings = await updateCompanyBillingSettings(companyId, body);
            return NextResponse.json(updatedSettings);
        } catch (_error: unknown) {
            return NextResponse.json({ error: (_error as Error).message || 'Failed to update billing settings' }, { status: 500 });
        }
    }

    return NextResponse.json({ error: `Method ${req.method} Not Allowed` }, { status: 405 });
}

export const PUT = withAuth(handler, ['admin', 'manager']);
export const GET = withAuth(handler, ['admin', 'manager']);
