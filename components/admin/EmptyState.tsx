'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {icon && (
                <div className="text-gray-200 dark:text-slate-700 mb-4">
                    {icon}
                </div>
            )}
            <h3 className="text-base font-bold text-gray-500 dark:text-gray-400 mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-gray-400 dark:text-gray-500 max-w-sm">{description}</p>
            )}
            {action && (
                <div className="mt-5">
                    {action.href ? (
                        <Link
                            href={action.href}
                            className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all"
                        >
                            {action.label}
                        </Link>
                    ) : (
                        <button
                            onClick={action.onClick}
                            className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all"
                        >
                            {action.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
