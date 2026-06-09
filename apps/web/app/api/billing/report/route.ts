import {NextRequest, NextResponse} from 'next/server';
import {z} from 'zod/v4';
import {generateBillingReport} from '@/lib/db/billing-service';
import {withAuth} from '@/lib/auth-utils';

const reportQuerySchema = z.object({
  companyId: z.uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetUserId: z.uuid().optional(),
});

async function handler(req: NextRequest) {
  const requestId = Date.now().toString();
  console.log(`[${requestId}] Billing report request started`);

  try {
    const {searchParams} = new URL(req.url);
    const rawParams = {
      companyId: searchParams.get('companyId') ?? undefined,
      startDate: searchParams.get('startDate') ?? undefined,
      endDate: searchParams.get('endDate') ?? undefined,
      targetUserId: searchParams.get('targetUserId') ?? undefined,
    };

    const parseResult = reportQuerySchema.safeParse(rawParams);
    if (!parseResult.success) {
      console.error(`[${requestId}] Validation failed:`, parseResult.error.issues);
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          issues: parseResult.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        {status: 400},
      );
    }

    const {companyId, startDate, endDate, targetUserId} = parseResult.data;

    console.log(`[${requestId}] Request params:`, {
      companyId,
      startDate,
      endDate,
      targetUserId,
    });

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
