'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    bookings: 'Bookings',
    guests: 'Guests',
    products: 'Products',
    categories: 'Categories',
    reports: 'Reports',
    staff: 'Staff',
    audit: 'Audit Logs',
    new: 'New',
};

export default function Breadcrumbs() {
    const pathname = usePathname();
    if (!pathname || pathname === '/admin' || pathname === '/admin/dashboard') return null;

    const segments = pathname.replace('/admin/', '').split('/').filter(Boolean);
    if (segments.length <= 1) return null;

    const crumbs: { label: string; href: string }[] = [
        { label: 'Dashboard', href: '/admin/dashboard' },
    ];

    let path = '/admin';
    for (const seg of segments) {
        path += `/${seg}`;
        const label = ROUTE_LABELS[seg] || (seg.length <= 8 ? `#${seg.toUpperCase()}` : seg);
        crumbs.push({ label, href: path });
    }

    return (
        <nav className="flex items-center gap-1 text-xs font-medium text-gray-400 dark:text-gray-500 mb-4">
            {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                    <span key={crumb.href} className="flex items-center gap-1">
                        {i > 0 && <ChevronRight className="w-3 h-3 flex-shrink-0" />}
                        {isLast ? (
                            <span className="text-gray-700 dark:text-gray-300 font-bold">{crumb.label}</span>
                        ) : (
                            <Link
                                href={crumb.href}
                                className="hover:text-primary transition-colors"
                            >
                                {crumb.label}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
