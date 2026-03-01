'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import StatusBadge from '@/components/admin/StatusBadge';
import Pagination from '@/components/admin/Pagination';
import Modal from '@/components/admin/Modal';

interface BookingItem {
    id: number;
    product_id: number;
    product_name: string;
    category: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

interface Booking {
    id: number;
    user_id: number | null;
    booking_date: string;
    check_out_date: string | null;
    booking_type: string;
    booking_time: string | null;
    status: string;
    payment_status: string;
    payment_method: string;
    total_amount: number;
    guest_first_name: string;
    guest_last_name: string;
    guest_email: string;
    guest_phone: string;
    special_requests: string | null;
    notes: string | null;
    created_at: string;
    items: BookingItem[];
}

interface EditForm {
    status: string;
    payment_status: string;
    payment_method: string;
    guest_first_name: string;
    guest_last_name: string;
    guest_email: string;
    guest_phone: string;
    booking_date: string;
    check_out_date: string;
    booking_type: string;
    special_requests: string;
    notes: string;
}

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const [editForm, setEditForm] = useState<EditForm>({
        status: '',
        payment_status: '',
        payment_method: '',
        guest_first_name: '',
        guest_last_name: '',
        guest_email: '',
        guest_phone: '',
        booking_date: '',
        check_out_date: '',
        booking_type: '',
        special_requests: '',
        notes: '',
    });

    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const itemsPerPage = 10;

    // 4.1 — Debounce search input
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [searchQuery]);

    // 4.4 — Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, debouncedSearch, dateFilter]);

    const fetchBookings = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            if (statusFilter !== 'all') {
                params.set('status', statusFilter);
            }
            if (dateFilter) {
                params.set('date', dateFilter);
            }
            if (debouncedSearch) {
                params.set('search', debouncedSearch);
            }
            params.set('limit', String(itemsPerPage));
            params.set('offset', String((currentPage - 1) * itemsPerPage));

            const response = await fetch(`/api/admin/bookings?${params}`, {
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setBookings(data.bookings || []);
                setTotalCount(data.pagination?.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, dateFilter, debouncedSearch, currentPage]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleView = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsViewModalOpen(true);
    };

    // 4.2 — Open edit modal and populate form
    const handleEdit = (booking: Booking) => {
        setSelectedBooking(booking);
        setSaveError(null);
        setEditForm({
            status: booking.status,
            payment_status: booking.payment_status,
            payment_method: booking.payment_method || 'cash',
            guest_first_name: booking.guest_first_name,
            guest_last_name: booking.guest_last_name,
            guest_email: booking.guest_email,
            guest_phone: booking.guest_phone,
            booking_date: booking.booking_date ? booking.booking_date.split('T')[0] : '',
            check_out_date: booking.check_out_date ? booking.check_out_date.split('T')[0] : '',
            booking_type: booking.booking_type,
            special_requests: booking.special_requests || '',
            notes: booking.notes || '',
        });
        setIsEditModalOpen(true);
    };

    // 4.3 — Show confirmation before saving
    const handleSaveClick = () => {
        setSaveError(null);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmSave = async () => {
        if (!selectedBooking) return;

        setIsSaving(true);
        setSaveError(null);

        try {
            const payload: Record<string, string | null> = {};

            // Only send fields that changed
            if (editForm.status !== selectedBooking.status) payload.status = editForm.status;
            if (editForm.payment_status !== selectedBooking.payment_status) payload.payment_status = editForm.payment_status;
            if (editForm.payment_method !== (selectedBooking.payment_method || 'cash')) payload.payment_method = editForm.payment_method;
            if (editForm.guest_first_name !== selectedBooking.guest_first_name) payload.guest_first_name = editForm.guest_first_name;
            if (editForm.guest_last_name !== selectedBooking.guest_last_name) payload.guest_last_name = editForm.guest_last_name;
            if (editForm.guest_email !== selectedBooking.guest_email) payload.guest_email = editForm.guest_email;
            if (editForm.guest_phone !== selectedBooking.guest_phone) payload.guest_phone = editForm.guest_phone;
            if (editForm.booking_type !== selectedBooking.booking_type) payload.booking_type = editForm.booking_type;
            if (editForm.special_requests !== (selectedBooking.special_requests || '')) payload.special_requests = editForm.special_requests || null;
            if (editForm.notes !== (selectedBooking.notes || '')) payload.notes = editForm.notes || null;

            const origDate = selectedBooking.booking_date ? selectedBooking.booking_date.split('T')[0] : '';
            if (editForm.booking_date !== origDate) payload.booking_date = editForm.booking_date;

            const origCheckOut = selectedBooking.check_out_date ? selectedBooking.check_out_date.split('T')[0] : '';
            if (editForm.check_out_date !== origCheckOut) payload.check_out_date = editForm.check_out_date || null;

            if (Object.keys(payload).length === 0) {
                setIsConfirmModalOpen(false);
                setIsEditModalOpen(false);
                return;
            }

            const response = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setIsConfirmModalOpen(false);
                setIsEditModalOpen(false);
                fetchBookings();
            } else {
                const data = await response.json().catch(() => ({}));
                setSaveError(data?.error || 'Failed to update booking');
                setIsConfirmModalOpen(false);
            }
        } catch (error) {
            console.error('Failed to update booking:', error);
            setSaveError('Network error. Please try again.');
            setIsConfirmModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent text-sm";
    const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider";

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-accent dark:text-white">Bookings</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Manage and track all customer bookings
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden sm:inline-block px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {totalCount} Total
                    </span>
                    <Link
                        href="/admin/bookings/new"
                        className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create New</span>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Search
                        </label>
                        <input
                            type="text"
                            placeholder="Search by name, ID, or product..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="w-full md:w-48">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={inputClass}
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="checked_out">Checked Out</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>

                    {/* Date Filter */}
                    <div className="w-full md:w-48">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Booking Date
                        </label>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-gray-600 dark:text-gray-300">Loading bookings...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="p-8 text-center text-gray-600 dark:text-gray-300">
                        No bookings found.
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            ID
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Dates
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Payment
                                        </th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                                    {bookings.map((booking) => (
                                        <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    #{booking.id}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {booking.guest_first_name} {booking.guest_last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        {booking.guest_email}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">
                                                    {new Date(booking.booking_date).toLocaleDateString()}
                                                    {booking.check_out_date && booking.check_out_date !== booking.booking_date && (
                                                        <> → {new Date(booking.check_out_date).toLocaleDateString()}</>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-900 dark:text-white capitalize">
                                                    {booking.booking_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    ₱{booking.total_amount.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={booking.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={booking.payment_status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link
                                                    href={`/admin/bookings/${booking.id}`}
                                                    className="text-primary hover:text-primary-600 mr-3"
                                                >
                                                    View
                                                </Link>
                                                <button
                                                    onClick={() => handleEdit(booking)}
                                                    className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>

            {/* View Modal */}
            <Modal
                isOpen={isViewModalOpen}
                onClose={() => setIsViewModalOpen(false)}
                title={`Booking #${selectedBooking?.id}`}
                size="lg"
            >
                {selectedBooking && (
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer</h4>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {selectedBooking.guest_first_name} {selectedBooking.guest_last_name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedBooking.guest_email}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{selectedBooking.guest_phone}</p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Booking Details</h4>
                                <p className="text-gray-900 dark:text-white">
                                    <span className="capitalize">{selectedBooking.booking_type}</span> booking
                                </p>
                                <p className="text-gray-900 dark:text-white">
                                    {new Date(selectedBooking.booking_date).toLocaleDateString()}
                                    {selectedBooking.check_out_date && (
                                        <> - {new Date(selectedBooking.check_out_date).toLocaleDateString()}</>
                                    )}
                                </p>
                                {selectedBooking.booking_time && (
                                    <p className="text-gray-600 dark:text-gray-300">Time: {selectedBooking.booking_time}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Items</h4>
                            <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                                {selectedBooking.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between py-2 border-b border-gray-200 dark:border-slate-700 last:border-0">
                                        <span className="text-gray-900 dark:text-white">
                                            {item.product_name} x{item.quantity}
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-white">
                                            ₱{item.subtotal.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                                <div className="flex justify-between pt-4 mt-2 border-t-2 border-gray-300 dark:border-slate-600">
                                    <span className="font-bold text-gray-900 dark:text-white">Total</span>
                                    <span className="font-bold text-primary">₱{selectedBooking.total_amount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {selectedBooking.special_requests && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Special Requests</h4>
                                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                                    {selectedBooking.special_requests}
                                </p>
                            </div>
                        )}

                        {selectedBooking.notes && (
                            <div>
                                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Staff Notes</h4>
                                <p className="text-gray-900 dark:text-white bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                    {selectedBooking.notes}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-4">
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Status: </span>
                                <StatusBadge status={selectedBooking.status} />
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Payment: </span>
                                <StatusBadge status={selectedBooking.payment_status} />
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Method: </span>
                                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                    {selectedBooking.payment_method || 'cash'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Modal — Full Form */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={`Edit Booking #${selectedBooking?.id}`}
                size="lg"
            >
                {selectedBooking && (
                    <div className="space-y-6">
                        {saveError && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                                {saveError}
                            </div>
                        )}

                        {/* Status & Payment Row */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Booking Status</label>
                                <select
                                    value={editForm.status}
                                    onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="checked_in">Checked In</option>
                                    <option value="checked_out">Checked Out</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Payment Status</label>
                                <select
                                    value={editForm.payment_status}
                                    onChange={(e) => setEditForm(f => ({ ...f, payment_status: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="unpaid">Unpaid</option>
                                    <option value="partial">Partial</option>
                                    <option value="paid">Paid</option>
                                    <option value="voided">Voided</option>
                                    <option value="refunded">Refunded</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Payment Method</label>
                                <select
                                    value={editForm.payment_method}
                                    onChange={(e) => setEditForm(f => ({ ...f, payment_method: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="gcash">GCash</option>
                                    <option value="paymaya">PayMaya</option>
                                </select>
                            </div>
                        </div>

                        {/* Guest Info */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Guest Information</h4>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>First Name</label>
                                    <input
                                        type="text"
                                        value={editForm.guest_first_name}
                                        onChange={(e) => setEditForm(f => ({ ...f, guest_first_name: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Last Name</label>
                                    <input
                                        type="text"
                                        value={editForm.guest_last_name}
                                        onChange={(e) => setEditForm(f => ({ ...f, guest_last_name: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Email</label>
                                    <input
                                        type="email"
                                        value={editForm.guest_email}
                                        onChange={(e) => setEditForm(f => ({ ...f, guest_email: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Phone</label>
                                    <input
                                        type="text"
                                        value={editForm.guest_phone}
                                        onChange={(e) => setEditForm(f => ({ ...f, guest_phone: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Booking Dates */}
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Booking Dates</h4>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClass}>Type</label>
                                    <select
                                        value={editForm.booking_type}
                                        onChange={(e) => setEditForm(f => ({ ...f, booking_type: e.target.value }))}
                                        className={inputClass}
                                    >
                                        <option value="day">Day Use</option>
                                        <option value="overnight">Overnight</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        {editForm.booking_type === 'overnight' ? 'Check-in' : 'Date'}
                                    </label>
                                    <input
                                        type="date"
                                        value={editForm.booking_date}
                                        onChange={(e) => setEditForm(f => ({ ...f, booking_date: e.target.value }))}
                                        className={inputClass}
                                    />
                                </div>
                                {editForm.booking_type === 'overnight' && (
                                    <div>
                                        <label className={labelClass}>Check-out</label>
                                        <input
                                            type="date"
                                            value={editForm.check_out_date}
                                            onChange={(e) => setEditForm(f => ({ ...f, check_out_date: e.target.value }))}
                                            className={inputClass}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Special Requests</label>
                                <textarea
                                    value={editForm.special_requests}
                                    onChange={(e) => setEditForm(f => ({ ...f, special_requests: e.target.value }))}
                                    rows={3}
                                    className={inputClass}
                                    placeholder="Guest special requests..."
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Staff Notes</label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                    rows={3}
                                    className={inputClass}
                                    placeholder="Internal notes (not visible to guest)..."
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveClick}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all text-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Confirmation Dialog */}
            <Modal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                title="Confirm Changes"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-700 dark:text-gray-300">
                        Are you sure you want to update booking <strong>#{selectedBooking?.id}</strong>? This action will take effect immediately.
                    </p>
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsConfirmModalOpen(false)}
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-sm disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all text-sm disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
