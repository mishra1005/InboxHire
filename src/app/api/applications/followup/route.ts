import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { companyName, contactName, daysElapsed } = await request.json();

    if (!companyName) {
      return NextResponse.json({ error: 'Missing companyName' }, { status: 400 });
    }

    const userName = session.user.name || 'Job Seeker';
    const cName = contactName || 'Hiring Team';
    const days = daysElapsed ? parseInt(daysElapsed) : 7;

    let subject = `Follow-up: Job Application at ${companyName}`;
    let body = '';

    if (days >= 14) {
      // 14 days: Final check-in
      subject = `Final Check-in: Application for ${companyName}`;
      body = `Hi ${cName},

I hope you're having a great week.

Since it's been a couple of weeks, I wanted to send a brief follow-up regarding the application I submitted for the open position at ${companyName}. I completely understand that your team is busy, but I would appreciate a quick update on my candidacy when you have a moment.

I remain highly interested in the opportunity to join your team and contribute. Please let me know if there are any next steps or if you require any further information from my side.

Thank you again for your time and consideration.

Best regards,

${userName}
${session.user.email}`;
    } else if (days >= 7) {
      // 7 days: Value addition / Strong interest
      subject = `Re: Application status at ${companyName}`;
      body = `Hi ${cName},

I hope this email finds you well.

I wanted to quickly check in on my application for the role at ${companyName} that I submitted last week. 

I'm incredibly excited about the work your team is doing, particularly around your recent projects, and I believe my background would be a strong fit for the position. 

Could you let me know if there are any updates regarding the next steps in the interview process? I'd love to connect.

Warmly,

${userName}
${session.user.email}`;
    } else {
      // 3 days: Gentle nudge
      subject = `Quick follow-up - ${companyName}`;
      body = `Hi ${cName},

I hope you're having a good week.

I'm writing to verify that my application for the role at ${companyName} was received successfully and to see if you need any additional materials or references from me.

I look forward to hearing about potential next steps.

Best,

${userName}
${session.user.email}`;
    }

    return NextResponse.json({ subject, body });
  } catch (err: any) {
    console.error('Follow-up Generation Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
