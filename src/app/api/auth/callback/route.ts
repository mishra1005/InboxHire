import { NextRequest, NextResponse } from 'next/server';
import { getRedirectUri, getTokens, getUserProfile } from '@/lib/googleOAuth';
import { setSession } from '@/lib/session';
import { prisma, hasDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/home?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/home?error=missing_code', request.url));
  }

  try {
    const redirectUri = getRedirectUri(request.headers);
    const tokens = await getTokens(code, redirectUri);
    const profile = await getUserProfile(tokens.access_token);

    if (!profile || !profile.email) {
      throw new Error('Failed to retrieve user email from Google');
    }

    const userData = {
      id: profile.id || profile.email,
      name: profile.name || 'Google User',
      email: profile.email,
      isDemo: false,
    };

    if (hasDb) {
      await prisma.user.upsert({
        where: { email: profile.email },
        update: {
          name: userData.name,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
        },
        create: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
        },
      });
    }

    await setSession({
      user: userData,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || null,
    });

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err: any) {
    console.error('OAuth Callback Error:', err);
    return NextResponse.redirect(
      new URL(`/home?error=${encodeURIComponent(err.message || 'auth_failed')}`, request.url)
    );
  }
}
