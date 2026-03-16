'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Mail,
    Phone,
    Calendar,
    Users,
    ChevronRight,
    Clock,
    DollarSign,
    History
} from 'lucide-react';
import { format } from 'date-fns';
import Pagination from '@/components/admin/Pagination';
import Modal from '@/components/admin/Modal';
import { adminFetch } from '@/lib/adminFetch';
import { toast } from 'sonner';

interface Guest {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: string;
    isActive: boolean;
    createdAt: string;
    isShadow: boolean;
    totalBookings: number;
    lastBookingDate: string | null;
    totalSpent: number;
}

export default function GuestManagementPage() {
    // State
    const [guests, setGuests] = useState<Guest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [sort, setSort] = useState('newest');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const limit = 20;

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch guests from real API
    const fetchGuests = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set('search', debouncedSearch);
            params.set('sort', sort);
            params.set('page', String(page));
            params.set('per_page', String(limit));

            const res = await adminFetch(`/api/admin/guests?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch guests');
            const data = await res.json();

            setGuests(data.guests || []);
            setTotalCount(data.pagination?.total || 0);
        } catch (error) {
            toast.error('Failed to load guests');
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, sort, page]);

    useEffect(() => {
        fetchGuests();
    }, [fetchGuests]);

    // Handlers
    const handleViewDetails = (guest: Guest) => {
        setSelectedGuest(guest);
        setIsDetailModalOpen(true);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-accent dark:text-white flex items-center gap-3">
                        Guest Management
                        <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {totalCount} Total
                        </span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        View and search guest accounts and booking histories.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-accent dark:text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-4">
                        <select
                            className="px-6 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-semibold text-gray-700 dark:text-gray-300"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                        >
                            <option value="newest">Newest First</option>
                            <option value="bookings">Most Bookings</option>
                            <option value="alpha">Alphabetical</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Guest Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Bookings</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Last Stay</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Registration</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-8">
                                            <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : guests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center">
                                        <Users className="w-12 h-12 text-gray-200 dark:text-slate-800 mx-auto mb-4" />
                                        <p className="text-gray-400 font-medium">No guests found matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                guests.map((guest) => (
                                    <tr
                                        key={guest.id}
                                        className={`group hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${guest.isShadow ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : ''}`}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                                                    {guest.firstName[0]}{guest.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-accent dark:text-white">
                                                        {guest.firstName} {guest.lastName}
                                                    </p>
                                                    {guest.isShadow && (
                                                        <span className="text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500">Shadow Account</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Mail className="w-3.5 h-3.5" />
                                                    {guest.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Phone className="w-3.5 h-3.5" />
                                                    {guest.phone}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                                {guest.totalBookings}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-semibold text-accent dark:text-white">
                                                {guest.lastBookingDate ? format(new Date(guest.lastBookingDate), 'MMM dd, yyyy') : 'Never'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {format(new Date(guest.createdAt), 'MMM dd, yyyy')}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={() => handleViewDetails(guest)}
                                                className="px-4 py-2 text-sm font-bold text-primary hover:bg-primary/10 rounded-xl transition-all inline-flex items-center gap-2"
                                            >
                                                View Details
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 border-t border-gray-50 dark:border-slate-800">
                    <Pagination
                        currentPage={page}
                        totalPages={Math.ceil(totalCount / limit)}
                        onPageChange={setPage}
                    />
                </div>
            </div>

            {/* Guest Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Guest Details"
                size="lg"
            >
                {selectedGuest && (
                    <div className="space-y-8">
                        {/* Profile Header */}
                        <div className="flex items-start gap-6 p-6 bg-gray-50 dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary-600 text-white flex items-center justify-center text-3xl font-black shadow-lg shadow-primary/20">
                                {selectedGuest.firstName[0]}{selectedGuest.lastName[0]}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-black text-accent dark:text-white">
                                        {selectedGuest.firstName} {selectedGuest.lastName}
                                    </h2>
                                    {selectedGuest.isShadow ? (
                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 text-[10px] font-black uppercase rounded-lg">Shadow</span>
                                    ) : (
                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-500 text-[10px] font-black uppercase rounded-lg">Registered</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <Mail className="w-4 h-4" />
                                        <span className="text-sm">{selectedGuest.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <Phone className="w-4 h-4" />
                                        <span className="text-sm">{selectedGuest.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-sm text-xs">Joined {format(new Date(selectedGuest.createdAt), 'MMM yyyy')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Widgets */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-2 text-gray-400">
                                    <History className="w-4 h-4" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider">Bookings</p>
                                </div>
                                <p className="text-2xl font-black text-accent dark:text-white">{selectedGuest.totalBookings}</p>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-2 text-gray-400">
                                    <DollarSign className="w-4 h-4" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider">Total Spent</p>
                                </div>
                                <p className="text-2xl font-black text-primary">₱{selectedGuest.totalSpent.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-2 text-gray-400">
                                    <Clock className="w-4 h-4" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider">Last Stay</p>
                                </div>
                                <p className="text-lg font-bold text-accent dark:text-white truncate">
                                    {selectedGuest.lastBookingDate ? format(new Date(selectedGuest.lastBookingDate), 'MMM dd') : 'Never'}
                                </p>
                            </div>
                        </div>

                        {/* History Note */}
                        <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-center">
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                                Full booking history and detailed analytics coming soon.
                            </p>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                            <button
                                onClick={() => setIsDetailModalOpen(false)}
                                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    toast.info("Navigating to full audit log...");
                                }}
                                className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all"
                            >
                                View All Activity
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
