import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { google } from 'googleapis';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const accessToken = session.accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    const query = 'from:me newer_than:30d';

    const response = await gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults: 50,
    });

    const threads = response.data.threads || [];
    const debugData = [];

    for (const t of threads) {
      if (!t.id) continue;
      const threadDetails = await gmail.users.threads.get({
        userId: 'me',
        id: t.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const messages = threadDetails.data.messages || [];
      const firstMsg = messages[0];
      const headers = firstMsg?.payload?.headers || [];
      const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
      const toHeader = headers.find((h) => h.name?.toLowerCase() === 'to')?.value || '';
      const subjectHeader = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';

      debugData.push({
        threadId: t.id,
        from: fromHeader,
        to: toHeader,
        subject: subjectHeader,
        messageCount: messages.length,
      });
    }

    return NextResponse.json({
      query,
      userEmail: session.user.email,
      threadsCount: threads.length,
      threads: debugData,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
