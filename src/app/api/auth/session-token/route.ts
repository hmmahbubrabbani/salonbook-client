import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Hands the httpOnly Better Auth session token to same-origin JS.
 *
 * salonbook-server runs on another origin, and cross-origin fetches never carry
 * this cookie. So after Google OAuth the browser presents the token explicitly
 * (POST /api/v1/auth/sync-session { sessionToken }) and the API issues its own
 * salonbook_token cookie on ITS domain.
 */
export async function GET() {
  const store = await cookies();
  const token =
    store.get('__Secure-better-auth.session_token')?.value ||
    store.get('better-auth.session_token')?.value ||
    '';

  return NextResponse.json(
    { success: Boolean(token), token },
    { headers: { 'cache-control': 'no-store' } }
  );
}
