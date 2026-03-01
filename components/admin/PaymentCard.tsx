'use client';

import { useState } from 'react';
import { Loader2, IndianRupee, RotateCcw, Ban, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import StatusBadge from './StatusBadge';
import Modal from './Modal';

interface PaymentCardProps {
    bookingId: string | number;
    paymentStatus: string;
    paymentMethod: string;
    totalAmount: number;
    paidAmount: number;
    onRefresh: () => void;
}

export default function PaymentCard({
    bookingId,
    paymentStatus,
    paymentMethod,
    totalAmount,
    paidAmount,
    onRefresh,
}: PaymentCardProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);
    const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
    const [collectAmount, setCollectAmount] = useState<number>(totalAmount - paidAmount);
    const [collectNotes, setCollectNotes] = useState('');

    const handlePaymentOperation = async (operation: string, body?: any) => {
        try {
            setIsLoading(operation);
            const res = await fetch(`/api/admin/bookings/${bookingId}/payment`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operation, ...body }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || `Failed to ${operation} payment`);
            }

            toast.success(`Payment ${operation}ed successfully`);
            setIsCollectModalOpen(false);
            onRefresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(null);
        }
    };

    const isUnpaid = paymentStatus === 'unpaid';
    const isPartial = paymentStatus === 'partial';
    const isPaid = paymentStatus === 'paid';

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-accent dark:text-white">Payment Details</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Manage billing and refunds</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={paymentStatus} />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
                        {paymentMethod || 'N/A'}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-800">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Total Amount</p>
                    <p className="text-2xl font-bold text-accent dark:text-white">₱{totalAmount.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20">
                    <p className="text-xs font-semibold text-green-600 uppercase mb-1">Paid Amount</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-500">₱{paidAmount.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20">
                    <p className="text-xs font-semibold text-orange-600 uppercase mb-1">Balance Due</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-500">₱{(totalAmount - paidAmount).toLocaleString()}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
                {(isUnpaid || isPartial) && (
                    <button
                        onClick={() => setIsCollectModalOpen(true)}
                        disabled={!!isLoading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-sm"
                    >
                        {isLoading === 'collect' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                        Collect Payment
                    </button>
                )}

                {(isPaid || isPartial) && (
                    <>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to void this payment? This will mark it as unpaid.')) {
                                    handlePaymentOperation('void');
                                }
                            }}
                            disabled={!!isLoading}
                            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 dark:bg-orange-900/10 dark:border-orange-800 dark:text-orange-400 disabled:opacity-50"
                        >
                            {isLoading === 'void' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                            Void Payment
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to refund this payment?')) {
                                    handlePaymentOperation('refund');
                                }
                            }}
                            disabled={!!isLoading}
                            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/10 dark:border-red-800 dark:text-red-400 disabled:opacity-50"
                        >
                            {isLoading === 'refund' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            Refund
                        </button>
                    </>
                )}
            </div>

            {/* Collect Payment Modal */}
            <Modal
                isOpen={isCollectModalOpen}
                onClose={() => setIsCollectModalOpen(false)}
                title="Collect Payment"
                size="sm"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount to Collect (₱)</label>
                        <input
                            type="number"
                            value={collectAmount}
                            onChange={(e) => setCollectAmount(Number(e.target.value))}
                            max={totalAmount - paidAmount}
                            className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                        <textarea
                            value={collectNotes}
                            onChange={(e) => setCollectNotes(e.currentTarget.value)}
                            rows={3}
                            className="w-full px-4 py-2 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:border-primary outline-none"
                            placeholder="Internal notes about this collection..."
                        />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setIsCollectModalOpen(false)}
                            className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handlePaymentOperation('collect', { amount: collectAmount, notes: collectNotes })}
                            disabled={!!isLoading || collectAmount <= 0}
                            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 disabled:opacity-50"
                        >
                            {isLoading === 'collect' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Collection'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
