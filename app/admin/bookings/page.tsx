'use client';

import { useState, useEffect, useCallback } from 'react';
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
    total_amount: number;
    guest_first_name: string;
    guest_last_name: string;
    guest_email: string;
    guest_phone: string;
    special_requests: string | null;
    created_at: string;
    items: BookingItem[];
}

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const itemsPerPage = 10;

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
            if (searchQuery) {
                params.set('search', searchQuery);
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
    }, [statusFilter, dateFilter, searchQuery, currentPage]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleView = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsViewModalOpen(true);
    };

    const handleEdit = (booking: Booking) => {
        setSelectedBooking(booking);
        setIsEditModalOpen(true);
    };

    const handleStatusChange = async (bookingId: number, newStatus: string) => {
        try {
            const response = await fetch(`/api/admin/bookings/${bookingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                fetchBookings();
                setIsEditModalOpen(false);
            }
        } catch (error) {
            console.error('Failed to update booking:', error);
        }
    };

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
                    <span className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {totalCount} Total
                    </span>
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
                            className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
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
                            className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
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
                            onChange={(e) => {
                                setDateFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
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
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleView(booking)}
                                                    className="text-primary hover:text-primary-600 mr-3"
                                                >
                                                    View
                                                </button>
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

                        <div className="flex gap-4">
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Status: </span>
                                <StatusBadge status={selectedBooking.status} />
                            </div>
                            <div>
                                <span className="text-sm text-gray-500 dark:text-gray-400">Payment: </span>
                                <StatusBadge status={selectedBooking.payment_status} />
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={`Edit Booking #${selectedBooking?.id}`}
            >
                {selectedBooking && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                defaultValue={selectedBooking.status}
                                onChange={(e) => handleStatusChange(selectedBooking.id, e.target.value)}
                                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                            >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="checked_in">Checked In</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Select a new status to update the booking.
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
}
