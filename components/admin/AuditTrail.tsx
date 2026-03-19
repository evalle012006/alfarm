'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, History, User } from 'lucide-react';
import { format } from 'date-fns';

interface AuditEntry {
    id: string;
    createdAt: string;
    actorName: string;
    action: string;
    metadata?: any;
}

interface AuditTrailProps {
    entityId: string | number;
    entityType: 'booking' | 'user' | 'payment';
    title?: string;
}

export default function AuditTrail({ entityId, entityType, title = "Audit Trail" }: AuditTrailProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen, entityId, entityType]);

    const fetchLogs = async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/admin/audit?entity_type=${entityType}&entity_id=${entityId}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (action: string) => {
        const act = action.toLowerCase();
        if (act.includes('checkin') || act.includes('check in') || act.includes('enable')) return 'bg-green-500';
        if (act.includes('payment') || act.includes('collect') || act.includes('role_change')) return 'bg-blue-500';
        if (act.includes('cancel') || act.includes('disable') || act.includes('password_reset')) return 'bg-red-500';
        return 'bg-gray-400';
    };

    const formatActionName = (action: string) => {
        return action.split('.').pop()?.replace(/_/g, ' ') || action;
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
            >
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-xl">
                        <History className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-black text-accent dark:text-white uppercase tracking-wider text-xs">{title}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Administrative History</p>
                    </div>
                    {logs.length > 0 && (
                        <span className="text-[10px] font-black bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                            {logs.length} EVENTS
                        </span>
                    )}
                </div>
                {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {isOpen && (
                <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-900/50">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-10 h-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-12">
                            <History className="w-12 h-12 text-gray-200 dark:text-slate-800 mx-auto mb-3" />
                            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">No history recorded yet</p>
                        </div>
                    ) : (
                        <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-slate-800 before:to-transparent">
                            {logs.map((log) => (
                                <div key={log.id} className="relative flex items-start gap-6 pl-5">
                                    <div className={`absolute left-0 mt-2 w-3 h-3 rounded-full ring-4 ring-white dark:ring-slate-900 shadow-sm ${getStatusColor(log.action)}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                                            <p className="text-sm font-black text-accent dark:text-white uppercase tracking-tight">
                                                {formatActionName(log.action)}
                                            </p>
                                            <time className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {format(new Date(log.createdAt), 'MMM dd, yyyy • HH:mm')}
                                            </time>
                                        </div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-slate-800 flex items-center justify-center">
                                                <User className="w-3 h-3 text-gray-500" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{log.actorName}</span>
                                        </div>

                                        {log.metadata && (
                                            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
                                                {(log.metadata.before || log.metadata.after) ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-slate-700">
                                                        {log.metadata.before && (
                                                            <div className="p-4">
                                                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-3 block">Before mutation</span>
                                                                <pre className="text-[10px] text-gray-500 dark:text-gray-400 font-mono whitespace-pre-wrap leading-relaxed">
                                                                    {JSON.stringify(log.metadata.before, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                        {log.metadata.after && (
                                                            <div className="p-4 bg-green-50/30 dark:bg-green-900/10">
                                                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-3 block">After mutation</span>
                                                                <pre className="text-[10px] text-gray-600 dark:text-gray-300 font-mono whitespace-pre-wrap leading-relaxed">
                                                                    {JSON.stringify(log.metadata.after, null, 2)}
                                                                </pre>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="p-4">
                                                        <pre className="text-[10px] text-gray-500 dark:text-gray-400 font-mono whitespace-pre-wrap">
                                                            {JSON.stringify(log.metadata, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
