'use client';

interface TableSkeletonProps {
    columns?: number;
    rows?: number;
}

export default function TableSkeleton({ columns = 6, rows = 5 }: TableSkeletonProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <tr>
                        {Array.from({ length: columns }).map((_, i) => (
                            <th key={i} className="px-6 py-4">
                                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full w-16 animate-pulse" />
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                    {Array.from({ length: rows }).map((_, rowIdx) => (
                        <tr key={rowIdx}>
                            {Array.from({ length: columns }).map((_, colIdx) => (
                                <td key={colIdx} className="px-6 py-4">
                                    <div
                                        className="h-4 bg-gray-100 dark:bg-slate-800 rounded animate-pulse"
                                        style={{ width: `${40 + Math.random() * 40}%` }}
                                    />
                                    {colIdx === 0 && (
                                        <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse mt-2 w-1/3" />
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
