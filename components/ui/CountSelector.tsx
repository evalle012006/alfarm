interface CountSelectorProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  helperText?: string;
  error?: string;
}

export default function CountSelector({
  label,
  value,
  min = 0,
  max,
  onChange,
  helperText,
  error,
}: CountSelectorProps) {
  const canDecrement = value > min;
  const canIncrement = max === undefined || value < max;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-white">{label}</span>
        {helperText && (
          <span className="text-xs text-gray-500 dark:text-white">{helperText}</span>
        )}
      </div>
      <div className="inline-flex items-center rounded-lg border-2 border-gray-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-accent-dark">
        <button
          type="button"
          onClick={() => canDecrement && onChange(value - 1)}
          disabled={!canDecrement}
          className="px-3 py-2 text-lg font-semibold text-gray-700 dark:text-white disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          -
        </button>
        <div className="px-4 py-2 text-center min-w-[3rem] text-gray-800 dark:text-white">
          {value}
        </div>
        <button
          type="button"
          onClick={() => canIncrement && onChange(value + 1)}
          disabled={!canIncrement}
          className="px-3 py-2 text-lg font-semibold text-gray-700 dark:text-white disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          +
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
