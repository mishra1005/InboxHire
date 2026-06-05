import { NextResponse } from 'next/server';
import { setSession } from '@/lib/session';

export async function POST() {
  const mockUser = {
    id: 'demo-user-id',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@example.com',
    isDemo: true,
  };

  await setSession({
    user: mockUser,
    accessToken: 'mock-access-token',
    refreshToken: null,
  });

  return NextResponse.json({ success: true, user: mockUser });
}
