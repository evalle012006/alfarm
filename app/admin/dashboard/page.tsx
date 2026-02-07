'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalProducts: number;
  totalRevenue: number;
}

/**
 * Admin Dashboard Page
 * 
 * Protected by middleware.ts (server-side).
 * Layout handles user info and navigation.
 */
export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    totalProducts: 0,
    totalRevenue: 0,
  });

  // Fetch dashboard stats on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch bookings to calculate stats
        const response = await fetch('/api/admin/bookings?limit=1000', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          const bookings = data.bookings || [];
          
          setStats({
            totalBookings: data.pagination?.total || bookings.length,
            pendingBookings: bookings.filter((b: { status: string }) => b.status === 'pending').length,
            confirmedBookings: bookings.filter((b: { status: string }) => b.status === 'confirmed').length,
            totalProducts: 0, // Would need products API
            totalRevenue: bookings.reduce((sum: number, b: { total_amount: number }) => sum + (b.total_amount || 0), 0),
          });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-8">
        <h2 className="text-3xl font-bold mb-2">Welcome to AlFarm Admin</h2>
        <p className="text-white/90">Here's your resort overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">📊</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
          </div>
          <div className="text-3xl font-bold text-gray-800 dark:text-white">{stats.totalBookings}</div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">Bookings</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">✅</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.confirmedBookings}</div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">Confirmed</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">⏳</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
          </div>
          <div className="text-3xl font-bold text-orange-600">{stats.pendingBookings}</div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">To Confirm</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow border border-gray-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl">�</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Revenue</div>
          </div>
          <div className="text-3xl font-bold text-primary">₱{stats.totalRevenue.toLocaleString()}</div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">Total</div>
        </div>
      </div>

      {/* Management Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        <Link href="/admin/bookings">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-slate-800">
            <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">📅</div>
            <h3 className="text-2xl font-bold text-center text-accent dark:text-white mb-3">
              Manage Bookings
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              View, confirm, and manage guest reservations
            </p>
            <div className="mt-4 text-center">
              <span className="text-primary font-semibold group-hover:underline">
                View Details →
              </span>
            </div>
          </div>
        </Link>

        <Link href="/admin/products">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-slate-800">
            <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">🏨</div>
            <h3 className="text-2xl font-bold text-center text-accent dark:text-white mb-3">
              Manage Products
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Add, edit, and manage rooms and add-ons
            </p>
            <div className="mt-4 text-center">
              <span className="text-primary font-semibold group-hover:underline">
                View Details →
              </span>
            </div>
          </div>
        </Link>

        <Link href="/admin/staff">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-gray-200 dark:border-slate-800">
            <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">👥</div>
            <h3 className="text-2xl font-bold text-center text-accent dark:text-white mb-3">
              Manage Staff
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Add and manage staff accounts and permissions
            </p>
            <div className="mt-4 text-center">
              <span className="text-primary font-semibold group-hover:underline">
                View Details →
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-800">
        <h3 className="text-xl font-bold text-accent dark:text-white mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/" className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors text-center">
            <div className="text-3xl mb-2">🌐</div>
            <p className="font-semibold text-accent dark:text-white">View Website</p>
          </Link>
          <Link href="/admin/audit" className="p-4 bg-secondary/10 dark:bg-secondary/20 rounded-lg hover:bg-secondary/20 dark:hover:bg-secondary/30 transition-colors text-center">
            <div className="text-3xl mb-2">�</div>
            <p className="font-semibold text-accent dark:text-white">Audit Logs</p>
          </Link>
          <Link href="/admin/bookings" className="p-4 bg-primary/10 dark:bg-primary/20 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors text-center">
            <div className="text-3xl mb-2">➕</div>
            <p className="font-semibold text-accent dark:text-white">New Booking</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
