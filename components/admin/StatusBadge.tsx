interface StatusBadgeProps {
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
    const statusConfig = {
        pending: {
            bg: 'bg-yellow-100 dark:bg-yellow-900/30',
            text: 'text-yellow-800 dark:text-yellow-200',
            border: 'border-yellow-200 dark:border-yellow-800',
            label: 'Pending'
        },
        confirmed: {
            bg: 'bg-green-100 dark:bg-green-900/30',
            text: 'text-green-800 dark:text-green-200',
            border: 'border-green-200 dark:border-green-800',
            label: 'Confirmed'
        },
        cancelled: {
            bg: 'bg-red-100 dark:bg-red-900/30',
            text: 'text-red-800 dark:text-red-200',
            border: 'border-red-200 dark:border-red-800',
            label: 'Cancelled'
        },
        completed: {
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            text: 'text-blue-800 dark:text-blue-200',
            border: 'border-blue-200 dark:border-blue-800',
            label: 'Completed'
        }
    };

    const config = statusConfig[status];

    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
        >
            {config.label}
        </span>
    );
}
