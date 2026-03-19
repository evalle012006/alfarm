'use client';

import { Loader2, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import Modal from './Modal';

interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

const variantStyles = {
    danger: {
        icon: <AlertTriangle className="w-6 h-6" />,
        iconBg: 'bg-red-50 dark:bg-red-900/20 text-red-600',
        confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-sm',
    },
    warning: {
        icon: <AlertCircle className="w-6 h-6" />,
        iconBg: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
        confirmBtn: 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm',
    },
    info: {
        icon: <Info className="w-6 h-6" />,
        iconBg: 'bg-primary/10 text-primary',
        confirmBtn: 'bg-primary hover:bg-primary-600 text-white shadow-sm',
    },
};

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    isLoading = false,
}: ConfirmDialogProps) {
    const styles = variantStyles[variant];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
            <div className="text-center py-2">
                <div className={`w-14 h-14 rounded-2xl ${styles.iconBg} flex items-center justify-center mx-auto mb-5`}>
                    {styles.icon}
                </div>
                <h3 className="text-lg font-bold text-accent dark:text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-8">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 px-4 py-3 text-sm font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${styles.confirmBtn}`}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
