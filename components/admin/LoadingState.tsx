'use client';

import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
    text?: string;
}

export default function LoadingState({ text = 'Loading...' }: LoadingStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{text}</p>
        </div>
    );
}
