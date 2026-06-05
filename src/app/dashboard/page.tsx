'use client';

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  LogOut, 
  Briefcase, 
  MessageSquare, 
  Calendar, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Application {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  status: 'Applied' | 'Replied' | 'Interview' | 'Rejected' | 'Follow Up Required';
  sentDate: string;
  lastActivity: string;
  subject: string;
  daysElapsed: number;
}

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Follow up Modal state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [followupDraft, setFollowupDraft] = useState<{ subject: string; body: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Quick UI notifications
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch Session
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data.session) {
          window.location.href = '/';
        } else {
          setSession(data.session);
          // 2. Fetch Applications initial sync
          fetchApplications(false);
        }
      })
      .catch(() => {
        window.location.href = '/';
      });
  }, []);

  const fetchApplications = (isManualResync = false) => {
    if (isManualResync) setSyncing(true);
    
    fetch(`/api/applications/sync${isManualResync ? '?resync=true' : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.applications) {
          setApplications(data.applications);
          if (isManualResync) {
            // Play confetti for satisfying user interaction!
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.8 }
            });
            showNotification(
              session?.user?.isDemo
                ? 'Demo synced! Added 2 new simulated application threads.'
                : 'Gmail Inbox synced successfully!'
            );
          }
        } else if (data.error) {
          showNotification(`Sync error: ${data.error}`);
        }
        setLoading(false);
        setSyncing(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        setSyncing(false);
      });
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleClassify = async (id: string, newStatus: string) => {
    // Optimistic Update
    const previousApps = [...applications];
    setApplications(
      applications.map((app) => 
        app.id === id ? { ...app, status: newStatus as any, daysElapsed: newStatus === 'Applied' ? 0 : app.daysElapsed } : app
      )
    );

    try {
      const res = await fetch('/api/applications/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!res.ok) {
        setApplications(previousApps);
        showNotification('Failed to update status.');
      } else {
        showNotification(`Status updated to ${newStatus}`);
      }
    } catch (err) {
      setApplications(previousApps);
      showNotification('Network error changing status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to ignore and delete this thread from your CRM?')) {
      return;
    }

    const previousApps = [...applications];
    setApplications(applications.filter((app) => app.id !== id));

    try {
      const res = await fetch('/api/applications/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'delete' }),
      });

      if (!res.ok) {
        setApplications(previousApps);
        showNotification('Failed to delete application.');
      } else {
        showNotification('Application removed from CRM.');
      }
    } catch (err) {
      setApplications(previousApps);
      showNotification('Network error deleting application.');
    }
  };

  const handleGenerateFollowup = async (app: Application) => {
    setSelectedApp(app);
    setGenerating(true);
    setCopied(false);
    
    try {
      const res = await fetch('/api/applications/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: app.companyName,
          contactName: app.contactName,
          daysElapsed: app.daysElapsed,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFollowupDraft(data);
      } else {
        showNotification('Failed to generate follow-up.');
        setSelectedApp(null);
      }
    } catch (err) {
      showNotification('Network error generating follow-up.');
      setSelectedApp(null);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyFollowup = () => {
    if (!followupDraft) return;
    navigator.clipboard.writeText(followupDraft.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markAsFollowedUp = async (appId: string) => {
    // Setting back to Applied resets the follow-up timer
    await handleClassify(appId, 'Applied');
    setSelectedApp(null);
    setFollowupDraft(null);
    showNotification('Follow-up recorded. Reminder timer reset!');
  };

  // Metric aggregates
  const totalApps = applications.length;
  const activeConversations = applications.filter((app) => app.status === 'Replied').length;
  const interviews = applications.filter((app) => app.status === 'Interview').length;
  const rejections = applications.filter((app) => app.status === 'Rejected').length;
  const followups = applications.filter((app) => app.status === 'Follow Up Required').length;

  // Filter & Search logic
  const filteredApps = applications.filter((app) => {
    const matchesSearch = 
      app.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.contactName && app.contactName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.contactEmail && app.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      app.subject.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === 'All') return matchesSearch;
    return app.status === statusFilter && matchesSearch;
  });

  // Critical alerts (Follow-ups required)
  const pendingFollowups = applications.filter((app) => app.status === 'Follow Up Required');

  if (loading) {
    return (
      <div className="flex-grow flex flex-col justify-center items-center bg-zinc-50 min-h-screen">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-zinc-500 font-medium text-sm">Loading your Job CRM dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col">
      {/* Dynamic Sync Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 bg-zinc-900 text-white px-5 py-3.5 rounded-xl shadow-xl z-50 text-sm flex items-center space-x-3 border border-zinc-800 animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-zinc-200/60 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg flex items-center justify-center shadow-md shadow-indigo-600/10">
              <Mail className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <span className="font-display font-bold text-lg tracking-tight">InboxHire</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                CRM
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {session?.user?.isDemo && (
              <span className="hidden sm:inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50">
                Demo Play Mode
              </span>
            )}
            
            <button
              onClick={() => fetchApplications(true)}
              disabled={syncing}
              className="inline-flex items-center space-x-2 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold text-sm px-4 py-2.5 rounded-xl active:scale-98 transition-all shadow-sm shadow-indigo-600/10 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Gmail'}</span>
            </button>

            <div className="h-6 w-px bg-zinc-200" />

            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-display font-semibold text-zinc-700 text-xs shadow-inner">
                {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-semibold text-zinc-800 leading-none">{session?.user?.name}</p>
                <p className="text-[10px] text-zinc-400 font-medium">{session?.user?.email}</p>
              </div>
              <a
                href="/api/auth/logout"
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 space-y-8">
        
        {/* Alerts Banner (Follow-up Alerts Section) */}
        {pendingFollowups.length > 0 && (
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start space-x-3">
              <div className="bg-amber-100 p-2 rounded-xl text-amber-800 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-900 text-sm">Action Required: Follow-up Reminders</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  You have {pendingFollowups.length} application{pendingFollowups.length > 1 ? 's' : ''} with no replies for 3+ days. Re-engaging keeps your pipelines warm.
                </p>
              </div>
            </div>

            {/* Quick alert carousel list */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {pendingFollowups.slice(0, 2).map((app) => (
                <div key={app.id} className="flex items-center justify-between gap-4 bg-white/80 border border-amber-200/40 rounded-xl p-2.5 text-xs shadow-xs">
                  <span className="text-zinc-700 font-medium">
                    You emailed <span className="font-semibold text-zinc-900">{app.contactName || 'recruiter'}</span> at <span className="font-semibold text-zinc-900">{app.companyName}</span> {app.daysElapsed} days ago.
                  </span>
                  <button
                    onClick={() => handleGenerateFollowup(app)}
                    className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-all cursor-pointer"
                  >
                    Generate Follow-Up
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Metrics / KPI Grid */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Applications', val: totalApps, icon: Briefcase, color: 'text-zinc-500 bg-zinc-100' },
            { label: 'Active Conversations', val: activeConversations, icon: MessageSquare, color: 'text-purple-600 bg-purple-50' },
            { label: 'Interviews', val: interviews, icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'Rejections', val: rejections, icon: XCircle, color: 'text-rose-600 bg-rose-50' },
            { label: 'Follow Ups Due', val: followups, icon: Clock, color: 'text-amber-600 bg-amber-50' }
          ].map((card, idx) => (
            <div key={idx} className="bg-white border border-zinc-200/50 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{card.label}</span>
                <div className={`p-1.5 rounded-lg ${card.color}`}>
                  <card.icon className="w-4.5 h-4.5" />
                </div>
              </div>
              <p className="font-display font-bold text-3xl mt-4 leading-none">{card.val}</p>
            </div>
          ))}
        </section>

        {/* Controls: Search, Filters */}
        <section className="bg-white border border-zinc-200/50 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by company, contact, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-sm placeholder-zinc-400 bg-zinc-50/50"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-400 uppercase mr-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter
              </span>
              {[
                { name: 'All', count: totalApps },
                { name: 'Applied', count: applications.filter(a => a.status === 'Applied').length },
                { name: 'Replied', count: activeConversations },
                { name: 'Interview', count: interviews },
                { name: 'Rejected', count: rejections },
                { name: 'Follow Up Required', count: followups, label: 'Follow Up' }
              ].map((filter) => (
                <button
                  key={filter.name}
                  onClick={() => setStatusFilter(filter.name)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer ${
                    statusFilter === filter.name
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  {filter.label || filter.name} ({filter.count})
                </button>
              ))}
            </div>

          </div>

          {/* Applications Table */}
          <div className="overflow-x-auto border border-zinc-100 rounded-xl">
            <table className="w-full border-collapse text-left text-sm text-zinc-500">
              <thead className="bg-zinc-50 border-b border-zinc-100 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <tr>
                  <th scope="col" className="px-6 py-4">Company</th>
                  <th scope="col" className="px-6 py-4">Contact</th>
                  <th scope="col" className="px-6 py-4">Status</th>
                  <th scope="col" className="px-6 py-4">Last Activity</th>
                  <th scope="col" className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-400">
                      <div className="flex flex-col items-center space-y-2">
                        <Briefcase className="w-8 h-8 text-zinc-300" />
                        <p className="font-medium">No opportunities found.</p>
                        <p className="text-xs">Try searching a different keyword or syncing your inbox.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const activityDate = new Date(app.lastActivity);
                    const isToday = activityDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <tr key={app.id} className="hover:bg-zinc-50/50 transition-colors">
                        {/* Company Details */}
                        <td className="px-6 py-4 font-medium text-zinc-900">
                          <div className="font-semibold text-zinc-800">{app.companyName}</div>
                          <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1 font-normal" title={app.subject}>
                            {app.subject}
                          </div>
                        </td>

                        {/* Contact Details */}
                        <td className="px-6 py-4">
                          {app.contactEmail ? (
                            <div>
                              <div className="font-medium text-zinc-700">{app.contactName || 'Recruiting Team'}</div>
                              <div className="text-xs text-zinc-400 mt-0.5">{app.contactEmail}</div>
                            </div>
                          ) : (
                            <span className="text-zinc-300 text-xs italic">No contact details</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              app.status === 'Applied'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/50'
                                : app.status === 'Replied'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200/50'
                                : app.status === 'Interview'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                                : app.status === 'Rejected'
                                ? 'bg-zinc-100 text-zinc-700 border border-zinc-200/50'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              app.status === 'Applied'
                                ? 'bg-blue-500'
                                : app.status === 'Replied'
                                ? 'bg-purple-500'
                                : app.status === 'Interview'
                                ? 'bg-emerald-500'
                                : app.status === 'Rejected'
                                ? 'bg-zinc-500'
                                : 'bg-amber-500'
                            }`} />
                            {app.status === 'Follow Up Required' ? 'Follow Up' : app.status}
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td className="px-6 py-4 text-zinc-600">
                          {isToday ? (
                            <span className="text-emerald-600 font-semibold">Today</span>
                          ) : (
                            <span>{app.daysElapsed} day{app.daysElapsed !== 1 ? 's' : ''} ago</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            
                            {/* Follow up shortcut */}
                            {(app.status === 'Follow Up Required' || app.status === 'Replied') && (
                              <button
                                onClick={() => handleGenerateFollowup(app)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Draft follow up email"
                              >
                                Follow Up
                              </button>
                            )}

                            {/* Classification manual dropdown */}
                            <div className="relative inline-block text-left">
                              <select
                                value={app.status}
                                onChange={(e) => handleClassify(app.id, e.target.value)}
                                className="text-xs font-medium bg-zinc-100 border border-zinc-200 hover:bg-zinc-200 text-zinc-700 rounded-lg px-2.5 py-1.5 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="Applied">Applied</option>
                                <option value="Replied">Replied</option>
                                <option value="Interview">Interview</option>
                                <option value="Rejected">Rejected</option>
                                <option value="Follow Up Required">Follow Up</option>
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(app.id)}
                              className="text-zinc-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete from CRM"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Follow-up Draft Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in scale-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="bg-zinc-50 border-b border-zinc-100 p-5 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-lg text-zinc-950 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  Follow-Up Email Draft
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Customized for <span className="font-semibold text-zinc-700">{selectedApp.companyName}</span> ({selectedApp.daysElapsed} days since last activity).
                </p>
              </div>
              <button
                onClick={() => { setSelectedApp(null); setFollowupDraft(null); }}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {generating ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs font-semibold text-zinc-500">Generating outreach draft...</span>
                </div>
              ) : (
                followupDraft && (
                  <div className="space-y-4">
                    
                    {/* Subject Line */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Subject Line</label>
                      <div className="bg-zinc-50 border border-zinc-200 px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-800 select-all">
                        {followupDraft.subject}
                      </div>
                    </div>

                    {/* Email Body */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Email Body</label>
                      <textarea
                        readOnly
                        rows={12}
                        value={followupDraft.body}
                        className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-xl text-sm text-zinc-800 focus:outline-none font-mono"
                      />
                    </div>

                  </div>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-zinc-500 text-center sm:text-left">
                Copy this draft, send it via Gmail, and record it.
              </span>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleCopyFollowup}
                  disabled={!followupDraft}
                  className="flex-grow sm:flex-grow-0 inline-flex items-center justify-center space-x-2 bg-zinc-950 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-800 active:scale-98 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Body</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => markAsFollowedUp(selectedApp.id)}
                  disabled={!followupDraft}
                  className="flex-grow sm:flex-grow-0 inline-flex items-center justify-center space-x-2 bg-indigo-600 text-white font-semibold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:scale-98 transition-all cursor-pointer"
                >
                  <span>Mark as Followed Up</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
