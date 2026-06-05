import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | InboxHire Job Search CRM',
  description: 'Manage your job opportunities, track responses, and automate follow-ups.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-50 text-zinc-900 min-h-screen flex flex-col font-sans dot-grid-light antialiased">
      {children}
    </div>
  );
}
