import {NextRequest, NextResponse} from 'next/server';

const ALLOWED_ORIGINS = [process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:4649'].filter(Boolean);

export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');

  // For same-origin requests without Origin header (e.g., form submissions)
  if (!origin && !referer) return false;

  if (origin) {
    return ALLOWED_ORIGINS.some((allowed) => origin === allowed);
  }

  if (referer) {
    try {
      const refererUrl = new URL(referer);
      return ALLOWED_ORIGINS.some((allowed) => {
        if (!allowed) return false;
        const allowedUrl = new URL(allowed);
        return refererUrl.origin === allowedUrl.origin;
      });
    } catch {
      return false;
    }
  }

  return false;
}

export function csrfProtection(req: NextRequest): NextResponse | null {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (!validateOrigin(req)) {
      return NextResponse.json({error: 'Invalid origin'}, {status: 403});
    }
  }
  return null;
}
