'use client';

import { useState } from 'react';
import { Save, Loader2, StickyNote } from 'lucide-react';
import { toast } from 'sonner';
import { adminFetch } from '@/lib/adminFetch';

interface StaffNotesProps {
    bookingId: string | number;
    initialNotes: string;
}

export default function StaffNotes({ bookingId, initialNotes }: StaffNotesProps) {
    const [notes, setNotes] = useState(initialNotes);
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        try {
            setIsLoading(true);
            const res = await adminFetch(`/api/admin/bookings/${bookingId}/notes`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes }),
            });

            if (!res.ok) {
                throw new Error('Failed to save notes');
            }

            toast.success('Notes saved successfully');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <StickyNote className="w-5 h-5 text-yellow-500" />
                <h3 className="font-bold text-accent dark:text-white">Staff Notes</h3>
            </div>

            <div className="space-y-4">
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.currentTarget.value)}
                    rows={5}
                    className="w-full p-4 rounded-xl border-2 border-transparent focus:border-primary bg-yellow-50 dark:bg-yellow-900/10 text-gray-800 dark:text-gray-200 outline-none transition-all resize-none font-medium text-sm"
                    placeholder="Enter internal staff notes here..."
                />
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isLoading || notes === initialNotes}
                        className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 transition-all"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Notes
                    </button>
                </div>
            </div>
        </div>
    );
}
