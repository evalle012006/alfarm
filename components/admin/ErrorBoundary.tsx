'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackMessage?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ErrorBoundary]', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/20 text-red-500 flex items-center justify-center mb-5">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                        Something went wrong
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-1">
                        {this.props.fallbackMessage || 'An unexpected error occurred while rendering this page.'}
                    </p>
                    {this.state.error && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-1 max-w-lg break-all">
                            {this.state.error.message}
                        </p>
                    )}
                    <button
                        onClick={this.handleRetry}
                        className="mt-6 px-6 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all"
                    >
                        Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
