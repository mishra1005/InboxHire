import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { prisma, hasDb } from '@/lib/db';
import { fetchGmailThreads } from '@/lib/gmailService';

// Standard mock data used for the Demo / fallback mode
const INITIAL_MOCK_APPLICATIONS = [
  {
    id: 'mock-app-1',
    companyName: 'Google',
    contactName: 'Nate Thompson',
    contactEmail: 'nathan@google.com',
    status: 'Replied',
    sentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    subject: 'Software Engineering Internship 2026',
    daysElapsed: 2,
  },
  {
    id: 'mock-app-2',
    companyName: 'Meta',
    contactName: 'Karla Garcia',
    contactEmail: 'kgarcia@meta.com',
    status: 'Applied',
    sentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago (Follow up required since it's user outreach and >= 7 days)
    subject: 'Full Stack Engineer Application',
    daysElapsed: 7,
  },
  {
    id: 'mock-app-3',
    companyName: 'Airbnb',
    contactName: 'Brian Chesky',
    contactEmail: 'brian@airbnb.com',
    status: 'Interview',
    sentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    lastActivity: new Date().toISOString(), // Today
    subject: 'Founder Referral Outreach',
    daysElapsed: 0,
  },
  {
    id: 'mock-app-4',
    companyName: 'Stripe',
    contactName: 'Liam O\'Connor',
    contactEmail: 'loconnor@stripe.com',
    status: 'Applied',
    sentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago (Follow Up Required because daysElapsed is >= 3)
    lastActivity: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    subject: 'Frontend Engineer Application',
    daysElapsed: 3,
  },
  {
    id: 'mock-app-5',
    companyName: 'Vercel',
    contactName: 'Guillermo Rauch',
    contactEmail: 'guillermo@vercel.com',
    status: 'Rejected',
    sentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastActivity: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    subject: 'DevRel Engineer Application - Next steps',
    daysElapsed: 12,
  }
];

// Additional applications synced on manual refresh in demo mode
const SYNCED_MOCK_APPLICATIONS = [
  {
    id: 'mock-app-6',
    companyName: 'OpenAI',
    contactName: 'Sam Altman',
    contactEmail: 'sam@openai.com',
    status: 'Interview',
    sentDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    subject: 'Research Engineer Role Discussion',
    daysElapsed: 1,
  },
  {
    id: 'mock-app-7',
    companyName: 'Netflix',
    contactName: 'Chloe Vance',
    contactEmail: 'cvance@netflix.com',
    status: 'Applied',
    sentDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago (Needs Follow Up!)
    lastActivity: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    subject: 'Senior UI Developer Opportunity',
    daysElapsed: 14,
  }
];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isManualResync = searchParams.get('resync') === 'true';
  const isDemo = session.user.isDemo || !hasDb;

  if (isDemo) {
    // Return standard demo list + supplementary lists if synced
    const applications = isManualResync
      ? [...INITIAL_MOCK_APPLICATIONS, ...SYNCED_MOCK_APPLICATIONS]
      : INITIAL_MOCK_APPLICATIONS;
    
    // Adjust mock follow up statuses on the fly based on elapsed days rules
    const formattedApps = applications.map(app => {
      let finalStatus = app.status;
      if (app.status === 'Applied') {
        if (app.daysElapsed >= 14 || app.daysElapsed >= 7 || app.daysElapsed >= 3) {
          finalStatus = 'Follow Up Required';
        }
      }
      return { ...app, status: finalStatus };
    });

    return NextResponse.json({ applications: formattedApps });
  }

  try {
    const userEmail = session.user.email;
    const accessToken = session.accessToken;

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Gmail access token' }, { status: 400 });
    }

    // 1. Fetch relevant threads from Gmail API
    const parsedThreads = await fetchGmailThreads(accessToken, userEmail);

    // 2. Write them to the Database via Prisma
    for (const thread of parsedThreads) {
      // Create or find Application
      let application = await prisma.application.findFirst({
        where: {
          userId: session.user.id,
          companyName: thread.companyName,
        },
      });

      if (!application) {
        application = await prisma.application.create({
          data: {
            userId: session.user.id,
            companyName: thread.companyName,
            contactName: thread.contactName,
            contactEmail: thread.contactEmail,
            status: thread.status,
            sentDate: thread.sentDate,
            lastActivity: thread.lastActivity,
          },
        });
      } else {
        // If it exists, update last activity and status
        // (but keep manually overridden statuses if user set them)
        const updatedStatus = application.status === 'Applied' || application.status === 'Follow Up Required'
          ? thread.status
          : application.status; // Keep user override if it's already custom
        
        application = await prisma.application.update({
          where: { id: application.id },
          data: {
            status: updatedStatus,
            lastActivity: thread.lastActivity,
            contactName: application.contactName || thread.contactName,
            contactEmail: application.contactEmail || thread.contactEmail,
          },
        });
      }

      // Upsert Thread
      await prisma.thread.upsert({
        where: { gmailThreadId: thread.gmailThreadId },
        update: {
          lastMessageDate: thread.lastActivity,
        },
        create: {
          applicationId: application.id,
          gmailThreadId: thread.gmailThreadId,
          subject: thread.subject,
          lastMessageDate: thread.lastActivity,
        },
      });
    }

    // 3. Fetch final consolidated list from Database
    const dbApplications = await prisma.application.findMany({
      where: { userId: session.user.id },
      include: { threads: true },
      orderBy: { lastActivity: 'desc' },
    });

    // Format output
    const applications = dbApplications.map((app) => {
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - app.lastActivity.getTime());
      const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let finalStatus = app.status;
      // Re-apply follow up rules if status is still Applied but timeline elapsed
      if (app.status === 'Applied' && daysElapsed >= 3) {
        finalStatus = 'Follow Up Required';
      }

      return {
        id: app.id,
        companyName: app.companyName,
        contactName: app.contactName,
        contactEmail: app.contactEmail,
        status: finalStatus,
        sentDate: app.sentDate.toISOString(),
        lastActivity: app.lastActivity.toISOString(),
        subject: app.threads[0]?.subject || 'Job Application',
        daysElapsed,
      };
    });

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error('Gmail Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
  }
}
