'use client';

import { Plus, Minus } from 'lucide-react';

interface QuantitySelectorProps {
    value: number;
    onChange: (newValue: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}

export default function QuantitySelector({
    value,
    onChange,
    min = 0,
    max,
    disabled = false
}: QuantitySelectorProps) {
    const handleDecrement = () => {
        if (value > min) {
            onChange(value - 1);
        }
    };

    const handleIncrement = () => {
        if (max === undefined || value < max) {
            onChange(value + 1);
        }
    };

    return (
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
            <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || value <= min}
                className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
                <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold text-accent dark:text-white tabular-nums">
                {value}
            </span>
            <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || (max !== undefined && value >= max)}
                className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-gray-500 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
}
