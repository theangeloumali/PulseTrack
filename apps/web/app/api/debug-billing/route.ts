import {NextRequest, NextResponse} from 'next/server';
import {getTimeEntriesForBilling} from '@/lib/db/service';
import {
  getBillingRatesByCompany,
  getCompanyBillingSettings,
  generateBillingReport,
} from '@/lib/db/billing-service';

export async function GET(req: NextRequest) {
  try {
    const {searchParams} = new URL(req.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!companyId || !startDate || !endDate) {
      return NextResponse.json({error: 'Missing companyId, startDate, or endDate'}, {status: 400});
    }

    console.log('🔍 DEBUG: Starting billing debug for:', {
      companyId,
      startDate,
      endDate,
    });

    // Step 1: Test time entries fetching
    let timeEntries;
    try {
      timeEntries = await getTimeEntriesForBilling(companyId, startDate, endDate);
      console.log('✅ Time entries fetched:', timeEntries?.length || 0, 'entries');
    } catch (error) {
      console.error('❌ Error fetching time entries:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch time entries',
          details: (error as Error).message,
          step: 'time_entries',
        },
        {status: 500},
      );
    }

    // Step 2: Test billing rates fetching
    let billingRates;
    try {
      billingRates = await getBillingRatesByCompany(companyId);
      console.log('✅ Billing rates fetched:', billingRates?.length || 0, 'rates');
    } catch (error) {
      console.error('❌ Error fetching billing rates:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch billing rates',
          details: (error as Error).message,
          step: 'billing_rates',
        },
        {status: 500},
      );
    }

    // Step 3: Test company settings fetching
    let companySettings;
    try {
      companySettings = await getCompanyBillingSettings(companyId);
      console.log('✅ Company settings fetched:', companySettings ? 'Found' : 'Not found');
    } catch (error) {
      console.error('❌ Error fetching company settings:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch company settings',
          details: (error as Error).message,
          step: 'company_settings',
        },
        {status: 500},
      );
    }

    // Step 4: Test report generation
    let report;
    try {
      report = await generateBillingReport(companyId, startDate, endDate);
      console.log('✅ Report generated with', Object.keys(report || {}).length, 'dates');
    } catch (error) {
      console.error('❌ Error generating report:', error);
      return NextResponse.json(
        {
          error: 'Failed to generate report',
          details: (error as Error).message,
          step: 'report_generation',
        },
        {status: 500},
      );
    }

    // Return debug information
    return NextResponse.json({
      success: true,
      debug: {
        timeEntriesCount: timeEntries?.length || 0,
        timeEntriesSample: timeEntries?.slice(0, 2) || [],
        billingRatesCount: billingRates?.length || 0,
        billingRatesSample: billingRates?.slice(0, 2) || [],
        companySettings: companySettings || null,
        reportDatesCount: Object.keys(report || {}).length,
        reportSample: Object.keys(report || {})
          .slice(0, 2)
          .reduce((acc, date) => {
            acc[date] = report[date];
            return acc;
          }, {} as any),
      },
      report: report,
      apiInfo: {
        nodeEnv: process.env.NODE_ENV,
        requestUrl: req.url,
      },
    });
  } catch (error) {
    console.error('❌ DEBUG: Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error in billing debug',
        details: (error as Error).message,
      },
      {status: 500},
    );
  }
}
