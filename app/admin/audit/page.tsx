'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  History,
  Search,
  Filter,
  User,
  Clock,
  Info,
  Eye,
  ChevronLeft,
  ChevronRight,
  Database,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: number;
  actorUserId: number | null;
  actorEmail: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: any;
  createdAt: string;
}

type PermissionSet = string[] | '*';

export default function AuditLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissions, setPermissions] = useState<PermissionSet>([]);
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    actorEmail: '',
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 15,
    offset: 0,
    hasMore: false,
  });

  const canReadAudit = permissions === '*' || permissions.includes('audit:read');

  async function fetchPermissions() {
    try {
      const response = await fetch('/api/admin/me', { credentials: 'include' });
      if (!response.ok) {
        router.push('/admin/login');
        return;
      }
      const data = await response.json();
      setPermissions(data.permissions);
    } catch {
      router.push('/admin/login');
    }
  }

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.action) params.set('action', filters.action);
      if (filters.entityType) params.set('entity_type', filters.entityType);
      if (filters.actorEmail) params.set('actor_email', filters.actorEmail);
      params.set('limit', String(pagination.limit));
      params.set('offset', String(pagination.offset));

      const response = await fetch(`/api/admin/audit?${params}`, { credentials: 'include' });

      if (!response.ok) {
        if (response.status === 403) {
          setError('You do not have permission to view audit logs');
          return;
        }
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.logs);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        hasMore: data.pagination.hasMore,
      }));
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.offset]);

  useEffect(() => {
    fetchPermissions();
  }, []);

  useEffect(() => {
    if (canReadAudit) {
      fetchLogs();
    }
  }, [canReadAudit, fetchLogs]);

  function formatAction(action: string) {
    const parts = action.split('.');
    return {
      category: parts[0],
      name: parts[parts.length - 1].replace(/_/g, ' ')
    };
  }

  function getActionColor(action: string) {
    const act = action.toLowerCase();
    if (act.includes('checkin') || act.includes('checkout') || act.includes('enable')) return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    if (act.includes('payment') || act.includes('create')) return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    if (act.includes('cancel') || act.includes('disable') || act.includes('password_reset')) return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    return 'text-gray-600 bg-gray-50 dark:bg-slate-800';
  }

  if (!canReadAudit && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-black mb-2 dark:text-white uppercase tracking-tight">Access Denied</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">You do not have the required permissions to view the system audit logs.</p>
          <Link href="/admin/dashboard" className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 dark:text-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-2xl">
                <History className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-4xl font-black text-accent dark:text-white tracking-tight uppercase">Audit Logs</h1>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs ml-16">
              Complete Administrative Transparency & compliance trail
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-6 py-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
            <Info className="w-5 h-5" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-6 mb-8 border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Advanced Log Filtering</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Process Action</label>
              <select
                value={filters.action}
                onChange={(e) => {
                  setFilters({ ...filters, action: e.target.value });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option value="">All Actions</option>
                <optgroup label="Bookings">
                  <option value="booking.create">Create Booking</option>
                  <option value="booking.checkin">Check In</option>
                  <option value="booking.checkout">Check Out</option>
                  <option value="booking.update">Update Records</option>
                  <option value="booking.cancel">Cancel Order</option>
                </optgroup>
                <optgroup label="Staff & Access">
                  <option value="staff.create">Add New Staff</option>
                  <option value="staff.update">Update Profile</option>
                  <option value="staff.disable">Disable Account</option>
                  <option value="staff.enable">Enable Account</option>
                  <option value="staff.password_reset">Password Reset</option>
                  <option value="staff.role_change">Role Change</option>
                </optgroup>
                <optgroup label="Payments">
                  <option value="payment.collect">Collect Funds</option>
                  <option value="payment.void">Void Transaction</option>
                  <option value="payment.refund">Process Refund</option>
                </optgroup>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Entity System</label>
              <select
                value={filters.entityType}
                onChange={(e) => {
                  setFilters({ ...filters, entityType: e.target.value });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
              >
                <option value="">All Systems</option>
                <option value="booking">Booking Engine</option>
                <option value="user">User Directory</option>
                <option value="payment">Financial Gateway</option>
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Search Actor</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Email or Name..."
                  value={filters.actorEmail}
                  onChange={(e) => {
                    setFilters({ ...filters, actorEmail: e.target.value });
                    setPagination(prev => ({ ...prev, offset: 0 }));
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="md:col-span-2 flex items-end">
              <button
                onClick={() => {
                  setFilters({ action: '', entityType: '', actorEmail: '' });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-primary transition-colors text-center"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100 dark:border-slate-800">
          {loading ? (
            <div className="py-32 text-center">
              <div className="animate-spin w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-4"></div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Synchronizing Records...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-32 text-center">
              <History className="w-20 h-20 text-gray-100 dark:text-slate-800 mx-auto mb-6" />
              <p className="text-sm font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">No activities recorded matching criteria</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Administrative Actor</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Action Type</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Target System</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Data Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {logs.map((log) => {
                      const action = formatAction(log.action);
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-accent dark:text-white">{format(new Date(log.createdAt), 'HH:mm:ss')}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{format(new Date(log.createdAt), 'MMM dd, yyyy')}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-black text-sm">
                                {log.actorName?.[0] || log.actorEmail?.[0] || 'U'}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-accent dark:text-white capitalize">{log.actorName || 'System Process'}</span>
                                <span className="text-[10px] font-bold text-gray-400">{log.actorEmail}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap">
                            <span className={`px-4 py-1.5 text-[10px] font-black rounded-full uppercase tracking-widest shadow-sm ${getActionColor(log.action)}`}>
                              {action.name}
                            </span>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Database className="w-3.5 h-3.5 text-gray-400" />
                              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{log.entityType}</span>
                              <span className="text-[10px] font-bold text-gray-300">#{log.entityId}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            {log.metadata && (
                              <details className="cursor-pointer group/details outline-none">
                                <summary className="list-none flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                                  <Eye className="w-3 h-3" />
                                  Inspect Data
                                </summary>
                                <div className="fixed inset-0 z-0 group-open/details:block hidden" onClick={(e) => {
                                  // This is a CSS-only hack, real implementation would use a proper modal
                                }} />
                                <div className="mt-4 p-5 bg-gray-100 dark:bg-slate-800 rounded-3xl text-[10px] font-mono whitespace-pre-wrap leading-relaxed shadow-inner border border-gray-200 dark:border-slate-700 max-w-lg relative z-10 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </div>
                              </details>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-8 py-6 bg-gray-50/50 dark:bg-slate-800/30 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Showing <span className="text-accent dark:text-white">{pagination.offset + 1}</span> - <span className="text-accent dark:text-white">{Math.min(pagination.offset + logs.length, pagination.total)}</span> / <span className="text-gray-500">{pagination.total}</span> Records
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                    disabled={pagination.offset === 0}
                    className="p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                    disabled={!pagination.hasMore}
                    className="p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
