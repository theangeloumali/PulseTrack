import { NextRequest, NextResponse } from 'next/server';
import { generateBillingReport } from '@/lib/db/billing-service';
import { withAuth } from '@/lib/auth-utils';

async function handler(req: NextRequest) {
    if (req.method === 'GET') {
        try {
            const { searchParams } = new URL(req.url);
            const companyId = searchParams.get('companyId');
            const startDate = searchParams.get('startDate');
            const endDate = searchParams.get('endDate');

            if (!companyId || !startDate || !endDate) {
                return NextResponse.json({ error: 'Missing companyId, startDate, or endDate' }, { status: 400 });
            }

            const report = await generateBillingReport(companyId, startDate, endDate);
            return NextResponse.json(report);
        } catch (_error: unknown) {
            return NextResponse.json({ error: (_error as Error).message || 'Failed to generate billing report' }, { status: 500 });
        }
    }

    return NextResponse.json({ error: `Method ${req.method} Not Allowed` }, { status: 405 });
}

export const GET = withAuth(handler, ['admin', 'manager']);
