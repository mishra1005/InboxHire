import { ParsedJobThread, parseContactHeader, cleanCompanyName, applyFollowUpLogic, isBlacklisted } from './emailParser';

export async function classifyThreadWithAI(
  subject: string,
  messages: Array<{ from: string; to: string; snippet: string; date: Date }>,
  userEmail: string
): Promise<ParsedJobThread | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (messages.length === 0) return null;

  const firstMsg = messages[0];
  const isSentByUser = firstMsg.from.toLowerCase().includes(userEmail.toLowerCase());

  // Enforce tracking only sent emails, not received initiations
  if (!isSentByUser) {
    return null;
  }

  const cleanSub = subject.replace(/^(re|fw|fwd):/i, '').trim();

  // Since it was sent by user, the contact is the recipient (to)
  const contactHeader = firstMsg.to;
  const contact = parseContactHeader(contactHeader);

  // Filter out automated or blacklisted emails early to save token usage
  if (isBlacklisted(contact.email, cleanSub)) {
    return null;
  }

  // Format context for Gemini
  const formattedMessages = messages.map((m, idx) => {
    return `[Message ${idx + 1}]
From: ${m.from}
To: ${m.to}
Date: ${m.date}
Snippet: ${m.snippet.substring(0, 400)}`; // Keep snippet bounded for performance
  }).join('\n\n');

  const prompt = `You are an expert recruitment assistant for a job search CRM.
Your task is to analyze the following email thread between the user and a company, and classify its status, company name, and contact representative.

User Email Address: ${userEmail}
Email Subject Line: ${cleanSub}
Recipient (Contact Email): ${contact.email}

Thread Messages:
${formattedMessages}

Classification Rules:
1. Status must be one of:
   - 'Applied': The user sent an application or outreach, and there is no response yet, or the responses are just automated system notifications.
   - 'Replied': A representative from the company has responded with a personal email (asking questions, requesting details, etc.), but NO interview has been scheduled yet, and no rejection has happened.
   - 'Interview': An interview, phone screen, technical test, or meet/call has been requested or scheduled.
   - 'Rejected': The company has sent a rejection email (e.g., "unfortunately we cannot move forward", "not proceeding", "decided to go with other candidates", "wish you luck").
2. Company Name: Extract the actual name of the company (e.g. Google, Supabase, Y Combinator). If it's a personal outreach to a domain you don't recognize, return a cleaned version of the email domain. If it cannot be determined, default to 'Direct Outreach'.
3. Contact Name: Extract the name of the recruiter/founder/person at the company communicating with the user (if identifiable, else return null).

Provide your response in JSON matching this schema:
{
  "status": "Applied" | "Replied" | "Interview" | "Rejected",
  "companyName": string,
  "contactName": string | null
}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              status: {
                type: 'STRING',
                enum: ['Applied', 'Replied', 'Interview', 'Rejected'],
              },
              companyName: {
                type: 'STRING',
              },
              contactName: {
                type: 'STRING',
                nullable: true,
              },
            },
            required: ['status', 'companyName'],
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('Empty response from Gemini API');
    }

    const result = JSON.parse(textOutput.trim());

    // Date calculations
    const sentDate = new Date(firstMsg.date);
    const lastMsg = messages[messages.length - 1];
    const lastActivity = new Date(lastMsg.date);

    // Calculate elapsed days
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
    const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const lastMessageFromUser = lastMsg.from.toLowerCase().includes(userEmail.toLowerCase());

    // Apply follow up rules dynamically
    const finalStatus = applyFollowUpLogic(result.status, lastMessageFromUser, daysElapsed);

    return {
      gmailThreadId: '', // Filled by caller
      subject: cleanSub,
      companyName: result.companyName || cleanCompanyName(contact.email.split('@')[1] || ''),
      contactName: result.contactName || contact.name,
      contactEmail: contact.email,
      status: finalStatus,
      sentDate,
      lastActivity,
      daysElapsed,
    };
  } catch (error) {
    console.error('Failed to classify thread using Gemini AI:', error);
    return null; // Fallback to standard regex classification
  }
}
