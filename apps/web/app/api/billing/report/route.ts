import {NextRequest, NextResponse} from 'next/server';
import {generateBillingReport} from '@/lib/db/billing-service';
import {withAuth} from '@/lib/auth-utils';

async function handler(req: NextRequest) {
  const requestId = Date.now().toString();
  console.log(`🚀 [${requestId}] Billing report request started`);

  try {
    const {searchParams} = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const targetUserId = searchParams.get('targetUserId'); // Optional user-specific filter

    console.log(`📋 [${requestId}] Request params:`, {
      companyId,
      startDate,
      endDate,
      targetUserId,
    });

    if (!companyId || !startDate || !endDate) {
      console.error(`❌ [${requestId}] Missing required parameters`);
      return NextResponse.json(
        {
          error: 'Missing companyId, startDate, or endDate',
          received: {
            companyId: !!companyId,
            startDate: !!startDate,
            endDate: !!endDate,
          },
        },
        {status: 400},
      );
    }

    // Validate date format
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      console.error(`❌ [${requestId}] Invalid date format`);
      return NextResponse.json(
        {
          error: 'Invalid date format. Use YYYY-MM-DD format',
          received: {startDate, endDate},
        },
        {status: 400},
      );
    }

    console.log(`⏳ [${requestId}] Generating billing report...`);
    const report = await generateBillingReport(
      companyId,
      startDate,
      endDate,
      targetUserId || undefined,
    );

    const reportStats = {
      totalDates: Object.keys(report).length,
      totalUsers: new Set(Object.values(report).flatMap((dateData) => Object.keys(dateData))).size,
      sampleKeys: Object.keys(report).slice(0, 3),
    };

    console.log(`✅ [${requestId}] Billing report generated successfully:`, reportStats);

    return NextResponse.json(report);
  } catch (error: unknown) {
    const errorMessage = (error as Error).message || 'Failed to generate billing report';
    console.error(`❌ [${requestId}] Billing report error:`, {
      message: errorMessage,
      stack: (error as Error).stack,
      error,
    });

    return NextResponse.json(
      {
        error: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
      },
      {status: 500},
    );
  }
}

export const GET = withAuth(handler, [
  'super_admin',
  'system_admin',
  'company_admin',
  'manager',
  'user',
]);
