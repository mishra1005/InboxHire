import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, hasDb } from '@/lib/db';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, status, action } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const isDemo = session.user.isDemo || !hasDb;

    if (action === 'delete') {
      if (!isDemo) {
        await prisma.application.deleteMany({
          where: {
            id,
            userId: session.user.id,
          },
        });
      }
      return NextResponse.json({ success: true, id, deleted: true });
    }

    if (!status) {
      return NextResponse.json({ error: 'Missing status' }, { status: 400 });
    }

    if (!isDemo) {
      const updated = await prisma.application.updateMany({
        where: {
          id,
          userId: session.user.id,
        },
        data: {
          status,
          lastActivity: new Date(), // Mark last activity as now
        },
      });

      if (updated.count === 0) {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, id, status });
  } catch (err: any) {
    console.error('Classification Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
