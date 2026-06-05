import { NextResponse } from 'next/server';
import { getAuthUrl, getRedirectUri } from '@/lib/googleOAuth';

export async function GET(request: Request) {
  try {
    const redirectUri = getRedirectUri(request.headers);
    const authUrl = getAuthUrl(redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
