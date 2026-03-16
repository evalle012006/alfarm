'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    BarChart3,
    DollarSign,
    Users,
    TrendingUp,
    Calendar,
    CreditCard,
    Package,
    Loader2,
    Download
} from 'lucide-react';
import { format } from 'date-fns';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

interface Summary {
    total_bookings: number;
    cancelled: number;
    total_revenue: number;
    avg_booking_value: number;
    unique_guests: number;
}

interface DayRevenue {
    date: string;
    bookings: number;
    revenue: number;
}

interface StatusItem {
    status: string;
    count: number;
}

interface PaymentMethodItem {
    method: string;
    count: number;
    total: number;
}

interface TopProduct {
    name: string;
    category: string;
    total_booked: number;
    total_revenue: number;
}

interface ReportData {
    range: number;
    summary: Summary;
    revenueByDay: DayRevenue[];
    statusBreakdown: StatusItem[];
    paymentMethods: PaymentMethodItem[];
    topProducts: TopProduct[];
}

export default function AdminReportsPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('30');

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminFetch(`/api/admin/reports?range=${range}&type=overview`);
            if (!res.ok) throw new Error('Failed to fetch report');
            const json = await res.json();
            setData(json);
        } catch {
            toast.error('Failed to load report data');
        } finally {
            setLoading(false);
        }
    }, [range]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    const statusColors: Record<string, string> = {
        pending: 'bg-orange-500',
        confirmed: 'bg-blue-500',
        checked_in: 'bg-green-500',
        checked_out: 'bg-purple-500',
        completed: 'bg-emerald-500',
        cancelled: 'bg-red-500',
    };

    const formatCurrency = (n: number) => `₱${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // Find max revenue for simple bar chart scaling
    const maxRevenue = data ? Math.max(...data.revenueByDay.map(d => d.revenue), 1) : 1;

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-accent dark:text-white flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-primary" />
                        Reports
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Revenue, bookings, and product performance analytics.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={range}
                        onChange={(e) => setRange(e.target.value)}
                        className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="7">Last 7 days</option>
                        <option value="14">Last 14 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="365">Last 365 days</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : data ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Bookings</span>
                            </div>
                            <p className="text-2xl font-black text-accent dark:text-white">{data.summary.total_bookings}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <DollarSign className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Revenue</span>
                            </div>
                            <p className="text-2xl font-black text-primary">{formatCurrency(data.summary.total_revenue)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Avg Value</span>
                            </div>
                            <p className="text-2xl font-black text-accent dark:text-white">{formatCurrency(data.summary.avg_booking_value)}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                                <Users className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Guests</span>
                            </div>
                            <p className="text-2xl font-black text-accent dark:text-white">{data.summary.unique_guests}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Cancelled</span>
                            </div>
                            <p className="text-2xl font-black text-red-500">{data.summary.cancelled}</p>
                        </div>
                    </div>

                    {/* Revenue Chart (simple CSS bar chart) */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800">
                        <h3 className="font-black text-accent dark:text-white mb-6 flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-primary" />
                            Daily Revenue
                        </h3>
                        {data.revenueByDay.length === 0 ? (
                            <p className="text-center text-gray-400 py-8">No data in this range.</p>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {data.revenueByDay.map((day) => (
                                    <div key={day.date} className="flex items-center gap-4 group">
                                        <div className="w-24 text-xs font-bold text-gray-400 flex-shrink-0">
                                            {format(new Date(day.date), 'MMM dd')}
                                        </div>
                                        <div className="flex-1 bg-gray-100 dark:bg-slate-800 rounded-full h-7 relative overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-primary to-primary-600 h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                                                style={{ width: `${Math.max((day.revenue / maxRevenue) * 100, 2)}%` }}
                                            >
                                                {day.revenue > 0 && (
                                                    <span className="text-[10px] font-black text-white whitespace-nowrap">
                                                        {formatCurrency(day.revenue)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="w-16 text-right text-xs font-bold text-gray-500 flex-shrink-0">
                                            {day.bookings} bk
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bottom Grid: Status + Payment + Top Products */}
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Status Breakdown */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800">
                            <h3 className="font-black text-accent dark:text-white mb-4 text-sm uppercase tracking-wider">Booking Status</h3>
                            <div className="space-y-3">
                                {data.statusBreakdown.map((item) => {
                                    const total = data.summary.total_bookings || 1;
                                    const pct = Math.round((item.count / total) * 100);
                                    return (
                                        <div key={item.status} className="flex items-center gap-3">
                                            <div className={`w-3 h-3 rounded-full ${statusColors[item.status] || 'bg-gray-400'}`} />
                                            <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 capitalize">{item.status.replace(/_/g, ' ')}</span>
                                            <span className="text-sm font-black text-accent dark:text-white">{item.count}</span>
                                            <span className="text-xs text-gray-400 w-10 text-right">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Payment Methods */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800">
                            <h3 className="font-black text-accent dark:text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-primary" />
                                Payment Methods
                            </h3>
                            <div className="space-y-4">
                                {data.paymentMethods.map((pm) => (
                                    <div key={pm.method} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-accent dark:text-white capitalize">{pm.method}</p>
                                            <p className="text-xs text-gray-400">{pm.count} transactions</p>
                                        </div>
                                        <p className="text-sm font-black text-primary">{formatCurrency(pm.total)}</p>
                                    </div>
                                ))}
                                {data.paymentMethods.length === 0 && (
                                    <p className="text-sm text-gray-400">No payment data.</p>
                                )}
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-100 dark:border-slate-800">
                            <h3 className="font-black text-accent dark:text-white mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                                <Package className="w-4 h-4 text-primary" />
                                Top Products
                            </h3>
                            <div className="space-y-3">
                                {data.topProducts.map((prod, i) => (
                                    <div key={prod.name} className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 min-w-0">
                                            <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-black flex-shrink-0">
                                                {i + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-accent dark:text-white truncate">{prod.name}</p>
                                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{prod.category} • {prod.total_booked} booked</p>
                                            </div>
                                        </div>
                                        <p className="text-xs font-black text-primary flex-shrink-0">{formatCurrency(prod.total_revenue)}</p>
                                    </div>
                                ))}
                                {data.topProducts.length === 0 && (
                                    <p className="text-sm text-gray-400">No product data.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-20">
                    <p className="text-gray-400">Failed to load report data.</p>
                </div>
            )}
        </div>
    );
}
