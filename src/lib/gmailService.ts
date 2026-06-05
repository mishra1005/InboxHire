import { google } from 'googleapis';
import { classifyThread, ParsedJobThread } from './emailParser';

export async function fetchGmailThreads(accessToken: string, userEmail: string): Promise<ParsedJobThread[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: 'v1', auth });

  const query = '(subject:(internship OR application OR recruiter OR hiring OR role OR opportunity OR position OR career OR job OR referral OR interview) OR "applied" OR "application") newer_than:30d';
  
  try {
    const response = await gmail.users.threads.list({
      userId: 'me',
      q: query,
      maxResults: 100, // Sync the latest 100 conversations to cover 30 days
    });

    const threads = response.data.threads || [];
    const parsedThreads: ParsedJobThread[] = [];

    for (const t of threads) {
      if (!t.id) continue;
      try {
        const threadDetails = await gmail.users.threads.get({
          userId: 'me',
          id: t.id,
          format: 'metadata',
          metadataHeaders: ['From', 'To', 'Subject', 'Date'],
        });

        const messages = threadDetails.data.messages || [];
        const formattedMessages = messages.map((m) => {
          const headers = m.payload?.headers || [];
          const fromHeader = headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
          const toHeader = headers.find((h) => h.name?.toLowerCase() === 'to')?.value || '';
          const subjectHeader = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value || '';
          const dateHeader = headers.find((h) => h.name?.toLowerCase() === 'date')?.value || '';
          
          return {
            from: fromHeader,
            to: toHeader,
            subject: subjectHeader,
            snippet: m.snippet || '',
            date: dateHeader ? new Date(dateHeader) : new Date(),
          };
        });

        // Sort messages by date to ensure proper timeline ordering
        formattedMessages.sort((a, b) => a.date.getTime() - b.date.getTime());

        if (formattedMessages.length === 0) continue;

        const subject = formattedMessages[0].subject || 'No Subject';
        const parsed = classifyThread(subject, formattedMessages, userEmail);

        if (parsed) {
          parsed.gmailThreadId = t.id;
          parsedThreads.push(parsed);
        }
      } catch (err) {
        console.error(`Error fetching thread detail for ${t.id}:`, err);
      }
    }

    return parsedThreads;
  } catch (error) {
    console.error('Error listing Gmail threads:', error);
    throw error;
  }
}
