'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminFetch';
import Modal from './Modal';

interface BookingEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: any;
    onSave: () => void;
}

// Valid status transitions: from → allowed targets (always includes self)
const STATUS_TRANSITIONS: Record<string, string[]> = {
    pending:     ['pending', 'confirmed', 'cancelled'],
    confirmed:   ['confirmed', 'checked_in', 'cancelled'],
    checked_in:  ['checked_in', 'checked_out'],
    checked_out: ['checked_out', 'completed'],
    completed:   ['completed'],
    cancelled:   ['cancelled', 'pending'],   // allow re-open
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    checked_in: 'Checked In',
    checked_out: 'Checked Out',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export default function BookingEditModal({ isOpen, onClose, booking, onSave }: BookingEditModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        guest_first_name: '',
        guest_last_name: '',
        guest_email: '',
        guest_phone: '',
        booking_date: '',
        check_out_date: '',
        booking_type: 'day',
        status: 'pending',
        payment_status: 'unpaid',
        payment_method: 'cash',
        special_requests: '',
        notes: '',
    });

    useEffect(() => {
        if (isOpen && booking) {
            setFormData({
                guest_first_name: booking.guest_first_name || '',
                guest_last_name: booking.guest_last_name || '',
                guest_email: booking.guest_email || booking.user_email || '',
                guest_phone: booking.guest_phone || '',
                booking_date: booking.booking_date ? booking.booking_date.split('T')[0] : '',
                check_out_date: booking.check_out_date ? booking.check_out_date.split('T')[0] : '',
                booking_type: booking.booking_type || 'day',
                status: booking.status || 'pending',
                payment_status: booking.payment_status || 'unpaid',
                payment_method: booking.payment_method || 'cash',
                special_requests: booking.special_requests || '',
                notes: booking.notes || '',
            });
        }
    }, [isOpen, booking]);

    const handleSubmit = async () => {
        if (!booking) return;

        const changes: Record<string, any> = {};
        const original = {
            guest_first_name: booking.guest_first_name || '',
            guest_last_name: booking.guest_last_name || '',
            guest_email: booking.guest_email || booking.user_email || '',
            guest_phone: booking.guest_phone || '',
            booking_date: booking.booking_date ? booking.booking_date.split('T')[0] : '',
            check_out_date: booking.check_out_date ? booking.check_out_date.split('T')[0] : '',
            booking_type: booking.booking_type || 'day',
            status: booking.status || 'pending',
            payment_status: booking.payment_status || 'unpaid',
            payment_method: booking.payment_method || 'cash',
            special_requests: booking.special_requests || '',
            notes: booking.notes || '',
        };

        for (const key of Object.keys(formData) as (keyof typeof formData)[]) {
            if (formData[key] !== original[key]) {
                changes[key] = formData[key];
            }
        }

        if (Object.keys(changes).length === 0) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            const res = await adminFetch(`/api/admin/bookings/${booking.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(changes),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update booking');
            }

            toast.success('Booking updated successfully');
            onSave();
            onClose();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!booking) return null;

    const inputClass = "w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm outline-none text-accent dark:text-white";
    const labelClass = "block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5";
    const selectClass = `${inputClass} appearance-none`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Booking" size="lg">
            <div className="space-y-6">
                {/* Guest Info */}
                <div>
                    <h4 className="text-sm font-black text-accent dark:text-white uppercase tracking-wider mb-4">Guest Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>First Name</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={formData.guest_first_name}
                                onChange={e => setFormData({ ...formData, guest_first_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Last Name</label>
                            <input
                                type="text"
                                className={inputClass}
                                value={formData.guest_last_name}
                                onChange={e => setFormData({ ...formData, guest_last_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Email</label>
                            <input
                                type="email"
                                className={inputClass}
                                value={formData.guest_email}
                                onChange={e => setFormData({ ...formData, guest_email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Phone</label>
                            <input
                                type="tel"
                                className={inputClass}
                                value={formData.guest_phone}
                                onChange={e => setFormData({ ...formData, guest_phone: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* Booking Details */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                    <h4 className="text-sm font-black text-accent dark:text-white uppercase tracking-wider mb-4">Booking Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Booking Type</label>
                            <select
                                className={selectClass}
                                value={formData.booking_type}
                                onChange={e => setFormData({ ...formData, booking_type: e.target.value })}
                            >
                                <option value="day">Day Use</option>
                                <option value="overnight">Overnight</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select
                                className={selectClass}
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                            >
                                {(STATUS_TRANSITIONS[booking?.status] || Object.keys(STATUS_LABELS)).map((s) => (
                                    <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                                ))}
                            </select>
                            {booking?.status && formData.status !== booking.status && (
                                <p className="mt-1 text-xs text-orange-500 font-medium">
                                    Changing status from {STATUS_LABELS[booking.status]} → {STATUS_LABELS[formData.status]}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className={labelClass}>Booking Date</label>
                            <input
                                type="date"
                                className={inputClass}
                                value={formData.booking_date}
                                onChange={e => setFormData({ ...formData, booking_date: e.target.value })}
                            />
                        </div>
                        {formData.booking_type === 'overnight' && (
                            <div>
                                <label className={labelClass}>Check-out Date</label>
                                <input
                                    type="date"
                                    className={inputClass}
                                    value={formData.check_out_date}
                                    min={formData.booking_date}
                                    onChange={e => setFormData({ ...formData, check_out_date: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Payment */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                    <h4 className="text-sm font-black text-accent dark:text-white uppercase tracking-wider mb-4">Payment</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Payment Status</label>
                            <select
                                className={selectClass}
                                value={formData.payment_status}
                                onChange={e => setFormData({ ...formData, payment_status: e.target.value })}
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
                                className={selectClass}
                                value={formData.payment_method}
                                onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                <option value="paymongo">PayMongo (Online)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                    <h4 className="text-sm font-black text-accent dark:text-white uppercase tracking-wider mb-4">Notes</h4>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Special Requests</label>
                            <textarea
                                rows={3}
                                className={`${inputClass} resize-none`}
                                value={formData.special_requests}
                                onChange={e => setFormData({ ...formData, special_requests: e.target.value })}
                                placeholder="Guest special requests..."
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Staff Notes</label>
                            <textarea
                                rows={3}
                                className={`${inputClass} resize-none bg-yellow-50 dark:bg-yellow-900/10`}
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Internal staff notes..."
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 rounded-xl font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex-1 px-6 py-3 rounded-xl font-bold bg-primary text-white hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </Modal>
    );
}
