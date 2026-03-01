'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Calendar,
    Clock,
    Mail,
    Phone,
    User as UserIcon,
    QrCode,
    Package,
    MessageSquare,
    AlertCircle,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import StatusBadge from '@/components/admin/StatusBadge';
import BookingDetailActions from '@/components/admin/BookingDetailActions';
import PaymentCard from '@/components/admin/PaymentCard';
import StaffNotes from '@/components/admin/StaffNotes';
import AuditTrail from '@/components/admin/AuditTrail';
import ProductModal from '@/components/admin/ProductModal';

export default function BookingDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const [booking, setBooking] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchBooking = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/admin/bookings/${id}`);
            if (!res.ok) {
                if (res.status === 404) {
                    toast.error('Booking not found');
                    router.push('/admin/bookings');
                    return;
                }
                throw new Error('Failed to fetch booking');
            }
            const data = await res.json();
            setBooking(data);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchBooking();
    }, [fetchBooking]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">Loading booking details...</p>
            </div>
        );
    }

    if (!booking) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Section 1 — Header Bar */}
            <div className="flex flex-col gap-4">
                <Link
                    href="/admin/bookings"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-primary transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Bookings
                </Link>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <h1 className="text-3xl font-bold text-accent dark:text-white">
                            Booking #{String(booking.id).slice(-6).toUpperCase()}
                        </h1>
                        <div className="flex gap-2">
                            <StatusBadge status={booking.status} />
                            <StatusBadge status={booking.payment_status} />
                        </div>
                    </div>
                    <BookingDetailActions
                        bookingId={booking.id}
                        status={booking.status}
                        onRefresh={fetchBooking}
                        onEdit={() => setIsEditModalOpen(true)}
                    />
                </div>
            </div>

            {/* Section 2 — Two-Column Info Grid */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-slate-800">
                    {/* Left column — Guest Information */}
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Guest Information</h3>
                        <div>
                            <p className="text-2xl font-bold text-accent dark:text-white mb-4">
                                {booking.guest_first_name} {booking.guest_last_name}
                            </p>
                            <div className="space-y-3">
                                <a href={`mailto:${booking.guest_email}`} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                                    <Mail className="w-4 h-4" />
                                    <span>{booking.guest_email}</span>
                                </a>
                                <a href={`tel:${booking.guest_phone}`} className="flex items-center gap-3 text-gray-600 dark:text-gray-300 hover:text-primary transition-colors">
                                    <Phone className="w-4 h-4" />
                                    <span>{booking.guest_phone}</span>
                                </a>
                                {booking.user_id && (
                                    <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                                        <UserIcon className="w-4 h-4" />
                                        <span>User ID: <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">{booking.user_id}</code></span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right column — Booking Details */}
                    <div className="space-y-6 md:pl-8 pt-8 md:pt-0">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Booking Details</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Package className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-bold text-white bg-primary px-2 py-0.5 rounded uppercase">
                                        {booking.booking_type === 'overnight' ? 'Overnight' : 'Day Use'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                    <Calendar className="w-4 h-4" />
                                    <div>
                                        <p className="text-xs text-gray-400">Date(s)</p>
                                        <p className="text-sm font-semibold">
                                            {format(new Date(booking.booking_date), 'MMM dd, yyyy')}
                                            {booking.check_out_date && ` — ${format(new Date(booking.check_out_date), 'MMM dd, yyyy')}`}
                                        </p>
                                    </div>
                                </div>
                                {booking.booking_time && (
                                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                        <Clock className="w-4 h-4" />
                                        <div>
                                            <p className="text-xs text-gray-400">Time Segment</p>
                                            <p className="text-sm font-semibold uppercase">{booking.booking_time}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                    <Clock className="w-4 h-4" />
                                    <div>
                                        <p className="text-xs text-gray-400">Booked On</p>
                                        <p className="text-sm font-semibold">{format(new Date(booking.created_at), 'MMM dd, yyyy HH:mm')}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
                                        <QrCode className="w-4 h-4" />
                                        <div>
                                            <p className="text-xs text-gray-400">QR Hash</p>
                                            <code className="text-[10px] font-mono bg-gray-100 dark:bg-slate-800 p-1 rounded break-all leading-tight">
                                                {booking.id}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section 3 — Booked Items Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-slate-800">
                    <h3 className="font-bold text-accent dark:text-white">Booked Items</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Product Name</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase">Category</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase">Qty</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase">Unit Price</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                            {booking.items?.map((item: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 text-sm font-bold text-accent dark:text-white">{item.product_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 uppercase">{item.category}</td>
                                    <td className="px-6 py-4 text-sm text-center font-medium">{item.quantity}</td>
                                    <td className="px-6 py-4 text-sm text-right">₱{item.unit_price.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-right font-bold text-accent dark:text-white">
                                        ₱{item.subtotal.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            {/* Headcount as extra items */}
                            <tr className="bg-gray-50/30 dark:bg-slate-800/20">
                                <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300 italic" colSpan={2}>Guest Entrance Count</td>
                                <td className="px-6 py-3 text-sm text-center font-medium">{booking.adults + booking.children}</td>
                                <td className="px-6 py-3 text-right" colSpan={2}>
                                    <span className="text-xs text-gray-400 uppercase mr-2 font-bold">Total Items</span>
                                    <span className="text-sm font-bold">₱{booking.total_amount.toLocaleString()}</span>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot className="bg-slate-800 dark:bg-black text-white">
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-right font-bold uppercase tracking-wider text-sm">Grand Total</td>
                                <td className="px-6 py-4 text-right text-xl font-bold text-primary">₱{booking.total_amount.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Section 4 — Payment Card */}
            <PaymentCard
                bookingId={booking.id}
                paymentStatus={booking.payment_status}
                paymentMethod={booking.payment_method}
                totalAmount={booking.total_amount}
                paidAmount={booking.paid_amount || 0}
                onRefresh={fetchBooking}
            />

            {/* Section 5 — Special Requests & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        <h3 className="font-bold text-accent dark:text-white">Special Requests</h3>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 text-gray-600 dark:text-gray-300 min-h-[100px] text-sm leading-relaxed border border-blue-100 dark:border-blue-900/20 italic">
                        {booking.special_requests || 'No special requests provided by guest.'}
                    </div>
                </div>
                <StaffNotes bookingId={booking.id} initialNotes={booking.notes || ''} />
            </div>

            {/* Section 6 — Audit Trail */}
            <AuditTrail bookingId={booking.id} />

            {/* Edit Modal Reuse */}
            <ProductModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                product={null} // Future: adjust ProductModal to handle bookings or use a dedicated BookingModal
            />
        </div>
    );
}
