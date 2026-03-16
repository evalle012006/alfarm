'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Admin keyboard shortcuts:
 * - Ctrl/Cmd+K: Focus search input on current page
 * - Esc: Close any open modal (handled by Modal component already)
 * - N: Create new item (navigates based on current page)
 */
export function useAdminShortcuts() {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Skip if user is typing in an input/textarea/select
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
                return;
            }

            // Ctrl/Cmd+K — focus search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.querySelector<HTMLInputElement>(
                    'input[type="text"][placeholder*="Search"]'
                );
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
                return;
            }

            // N — create new (no modifier keys)
            if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (pathname?.startsWith('/admin/bookings') && pathname === '/admin/bookings') {
                    router.push('/admin/bookings/new');
                }
                return;
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [pathname, router]);
}
