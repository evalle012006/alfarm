'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuditLog {
  id: number;
  actorUserId: number | null;
  actorEmail: string;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
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
    limit: 50,
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

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString();
  }

  function formatAction(action: string) {
    return action.replace('.', ' → ').replace(/_/g, ' ');
  }

  if (!canReadAudit && !loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-slate-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            You do not have permission to view this page.
          </div>
          <Link href="/admin/dashboard" className="text-primary hover:underline mt-4 inline-block">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-accent dark:text-white">Audit Logs</h1>
            <p className="text-gray-600 dark:text-gray-300">Track all administrative actions</p>
          </div>
          <Link 
            href="/admin/dashboard" 
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            ← Back
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-4 mb-6 border border-gray-200 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => {
                  setFilters({ ...filters, action: e.target.value });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">All Actions</option>
                <option value="booking.checkin">Check In</option>
                <option value="booking.checkout">Check Out</option>
                <option value="booking.update">Booking Update</option>
                <option value="booking.cancel">Booking Cancel</option>
                <option value="payment.collect">Payment Collect</option>
                <option value="payment.void">Payment Void</option>
                <option value="payment.refund">Payment Refund</option>
                <option value="staff.create">Staff Create</option>
                <option value="staff.update">Staff Update</option>
                <option value="staff.disable">Staff Disable</option>
                <option value="staff.enable">Staff Enable</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Entity Type</label>
              <select
                value={filters.entityType}
                onChange={(e) => {
                  setFilters({ ...filters, entityType: e.target.value });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">All Types</option>
                <option value="booking">Booking</option>
                <option value="user">User</option>
                <option value="payment">Payment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Actor Email</label>
              <input
                type="text"
                placeholder="Search by email..."
                value={filters.actorEmail}
                onChange={(e) => {
                  setFilters({ ...filters, actorEmail: e.target.value });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ action: '', entityType: '', actorEmail: '' });
                  setPagination(prev => ({ ...prev, offset: 0 }));
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-slate-800">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-600 dark:text-gray-300">
              No audit logs found.
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Actor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Action
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Entity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium">{log.actorName || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{log.actorEmail}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className="text-gray-600 dark:text-gray-300 capitalize">{log.entityType}</span>
                        <span className="text-gray-400 ml-1">#{log.entityId}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {log.metadata && (
                          <details className="cursor-pointer">
                            <summary className="text-primary hover:underline">View</summary>
                            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-w-md">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Showing {pagination.offset + 1} - {Math.min(pagination.offset + logs.length, pagination.total)} of {pagination.total}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                    disabled={pagination.offset === 0}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                    disabled={!pagination.hasMore}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                  >
                    Next
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
