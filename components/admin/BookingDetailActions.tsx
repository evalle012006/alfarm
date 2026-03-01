'use client';

import { useState } from 'react';
import { Loader2, Check, UserCheck, LogOut, XCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';

interface BookingDetailActionsProps {
    bookingId: string | number;
    status: string;
    onRefresh: () => void;
    onEdit: () => void;
}

export default function BookingDetailActions({
    bookingId,
    status,
    onRefresh,
    onEdit,
}: BookingDetailActionsProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    const handleAction = async (action: string, method: string, endpoint: string, body?: any) => {
        try {
            setIsLoading(action);
            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to ${action}`);
            }

            toast.success(`Booking ${action} successfully`);
            onRefresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(null);
        }
    };

    const isPending = status === 'pending';
    const isConfirmed = status === 'confirmed';
    const isCheckedIn = status === 'checked_in';
    const isCancellable = !['cancelled', 'completed', 'checked_out'].includes(status);

    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {isPending && (
                <button
                    onClick={() => handleAction('confirmed', 'PATCH', `/api/admin/bookings/${bookingId}`, { status: 'confirmed' })}
                    disabled={!!isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-600 disabled:opacity-50"
                >
                    {isLoading === 'confirmed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Confirm
                </button>
            )}

            {isConfirmed && (
                <button
                    onClick={() => handleAction('checked in', 'POST', `/api/admin/bookings/${bookingId}/checkin`)}
                    disabled={!!isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {isLoading === 'checked in' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                    Check In
                </button>
            )}

            {isCheckedIn && (
                <button
                    onClick={() => handleAction('checked out', 'POST', `/api/admin/bookings/${bookingId}/checkout`)}
                    disabled={!!isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {isLoading === 'checked out' ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Check Out
                </button>
            )}

            {isCancellable && (
                <button
                    onClick={() => {
                        if (confirm('Are you sure you want to cancel this booking?')) {
                            handleAction('cancelled', 'DELETE', `/api/admin/bookings/${bookingId}`);
                        }
                    }}
                    disabled={!!isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/10 dark:border-red-800 disabled:opacity-50"
                >
                    {isLoading === 'cancelled' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Cancel
                </button>
            )}

            <button
                onClick={onEdit}
                disabled={!!isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-700 disabled:opacity-50"
            >
                <Edit className="w-4 h-4" />
                Edit
            </button>
        </div>
    );
}
