export interface ParsedJobThread {
  gmailThreadId: string;
  subject: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  status: 'Applied' | 'Replied' | 'Interview' | 'Rejected' | 'Follow Up Required';
  sentDate: Date;
  lastActivity: Date;
  daysElapsed: number;
}

const JOB_KEYWORDS = [
  'internship',
  'application',
  'recruiter',
  'hiring',
  'role',
  'opportunity',
  'position',
  'career',
  'job',
  'referral',
  'interview',
  'apply'
];

export function cleanCompanyName(domain: string): string {
  // Strip common email domains
  const common = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'protonmail.com', 'icloud.com', 'aol.com', 'mail.com'];
  if (common.includes(domain.toLowerCase())) {
    return 'Direct Outreach';
  }

  // Extract primary domain: hr@recruiting.stripe.com -> stripe
  const parts = domain.split('.');
  if (parts.length >= 2) {
    // If it's a domain like stripe.co.uk or strip.com
    const main = parts[parts.length - 2];
    if (main.length <= 3 && parts.length >= 3) {
      // e.g. stripe.co.uk -> parts: [stripe, co, uk] -> main is 'co' (too short), return 'stripe'
      return capitalize(parts[parts.length - 3]);
    }
    return capitalize(main);
  }
  return capitalize(domain);
}

function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function parseContactHeader(headerValue: string): { name: string; email: string } {
  // Matches "Name <email@domain.com>" or just "email@domain.com"
  const regex = /(?:"?([^"<]*)"?\s*)?<([^>]+)>/;
  const match = headerValue.match(regex);
  if (match) {
    return {
      name: match[1]?.trim() || match[2].split('@')[0],
      email: match[2].trim(),
    };
  }
  return {
    name: headerValue.split('@')[0] || headerValue,
    email: headerValue.trim(),
  };
}

export function isJobRelated(subject: string, bodySnippet: string): boolean {
  const content = `${subject} ${bodySnippet}`.toLowerCase();
  return JOB_KEYWORDS.some((keyword) => content.includes(keyword));
}

const BLACKLISTED_DOMAINS = [
  'github.com',
  'gitlab.com',
  'linkedin.com',
  'medium.com',
  'slack.com',
  'discord.com',
  'zoom.us',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com'
];

const BLACKLISTED_EMAIL_KEYWORDS = [
  'no.reply',
  'no-reply',
  'noreply',
  'notification',
  'alert',
  'newsletter',
  'billing',
  'invoice',
  'support',
  'info',
  'bounce',
  'marketing',
  'security'
];

const BLACKLISTED_SUBJECT_KEYWORDS = [
  'security alert',
  'pull request',
  'issue',
  'starred',
  'welcome to',
  'billing',
  'invoice',
  'receipt',
  'transaction',
  'verification code',
  'one-time password',
  ' otp ',
  'login alert',
  'sign-in',
  'newsletter',
  'subscription'
];

export function isBlacklisted(email: string, subject: string): boolean {
  const emailLower = email.toLowerCase();
  const subjectLower = subject.toLowerCase();

  // Check domains
  const domain = emailLower.split('@')[1] || '';
  if (BLACKLISTED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d))) {
    return true;
  }

  // Check email user part / address keywords
  if (BLACKLISTED_EMAIL_KEYWORDS.some(kw => emailLower.includes(kw))) {
    return true;
  }

  // Check subject keywords
  if (BLACKLISTED_SUBJECT_KEYWORDS.some(kw => subjectLower.includes(kw))) {
    return true;
  }

  return false;
}

export function classifyThread(
  subject: string,
  messages: Array<{ from: string; to: string; snippet: string; date: Date }>,
  userEmail: string
): ParsedJobThread | null {
  if (messages.length === 0) return null;

  // The first message is the start of the outreach/application
  const firstMsg = messages[0];
  const isSentByUser = firstMsg.from.toLowerCase().includes(userEmail.toLowerCase());
  
  // Enforce tracking only sent emails, not received initiations
  if (!isSentByUser) {
    return null;
  }

  // Clean subject
  const cleanSub = subject.replace(/^(re|fw|fwd):/i, '').trim();

  // Since it was sent by user, the contact is the recipient (to)
  let contactHeader = firstMsg.to;
  const contact = parseContactHeader(contactHeader);

  // Filter out automated or blacklisted emails early
  if (isBlacklisted(contact.email, cleanSub)) {
    return null;
  }

  const domain = contact.email.split('@')[1] || '';
  let companyName = cleanCompanyName(domain);

  // If the email address has a variant of no-reply, do not consider it a Cold Email/Direct Outreach
  if (contact.email.toLowerCase().includes('no.reply') || 
      contact.email.toLowerCase().includes('no-reply') || 
      contact.email.toLowerCase().includes('noreply')) {
    if (companyName === 'Direct Outreach') {
      companyName = 'System Notification';
    }
  }

  // Check if thread is job-related
  const bodyCombined = messages.map(m => m.snippet).join(' ');
  if (!isJobRelated(cleanSub, bodyCombined)) {
    return null;
  }

  // Determine dates
  const sentDate = new Date(firstMsg.date);
  const lastMsg = messages[messages.length - 1];
  const lastActivity = new Date(lastMsg.date);

  // Calculate elapsed days
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastActivity.getTime());
  const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Determine status
  let status: ParsedJobThread['status'] = 'Applied';
  
  // Check if there are any messages from the contact (replies to the user)
  const incomingMessages = messages.filter(
    (m) => !m.from.toLowerCase().includes(userEmail.toLowerCase())
  );

  const lastMessageFromUser = lastMsg.from.toLowerCase().includes(userEmail.toLowerCase());

  if (incomingMessages.length > 0) {
    status = 'Replied';

    // Check if reply contains interview keywords
    const replyContent = incomingMessages.map((m) => m.snippet.toLowerCase()).join(' ');
    
    const interviewKeywords = ['interview', 'schedule', 'call', 'meet', 'zoom', 'invite', 'calendar', 'availab'];
    const rejectionKeywords = ['unfortunately', 'not proceeding', 'other candidates', 'selected others', 'rejection', 'unable to offer', 'wish you luck'];

    if (interviewKeywords.some((kw) => replyContent.includes(kw))) {
      status = 'Interview';
    } else if (rejectionKeywords.some((kw) => replyContent.includes(kw))) {
      status = 'Rejected';
    }
  }

  // Follow Up rules apply if the last message in the thread is from the user
  // and there has been no reply after it for 3, 7, or 14 days
  if (lastMessageFromUser && status !== 'Rejected' && status !== 'Interview') {
    if (daysElapsed >= 3) {
      status = 'Follow Up Required';
    }
  }

  return {
    gmailThreadId: '', // To be filled by caller
    subject: cleanSub,
    companyName,
    contactName: contact.name,
    contactEmail: contact.email,
    status,
    sentDate,
    lastActivity,
    daysElapsed,
  };
}
