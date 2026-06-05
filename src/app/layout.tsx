import type { Metadata } from 'next';
import './globals.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'InboxHire | Gmail-Powered Job Search CRM',
  description: 'Automatically turn your Gmail inbox into a structured job search CRM. Track applications, responses, interviews, and follow-up deadlines without manual data entry.',
  keywords: ['job tracker', 'job CRM', 'Gmail job search', 'job application tracker', 'follow up reminder', 'career pipeline'],
  authors: [{ name: 'InboxHire Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col bg-background text-foreground selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
