'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  Hotel,
  Users,
  Globe,
  Search,
  Plus,
  ArrowRight
} from 'lucide-react';

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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-primary to-primary-600 text-white rounded-3xl p-10 shadow-lg shadow-primary/20">
        <h2 className="text-4xl font-black mb-2 tracking-tight">Welcome to AlFarm Admin</h2>
        <p className="text-white/80 text-lg font-medium">Here's your resort overview for today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-slate-800 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</div>
          </div>
          <div className="text-3xl font-black text-accent dark:text-white">{stats.totalBookings}</div>
          <div className="text-gray-500 font-bold dark:text-gray-400 mt-1 uppercase text-[10px] tracking-wider">Bookings</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-slate-800 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</div>
          </div>
          <div className="text-3xl font-black text-green-600">{stats.confirmedBookings}</div>
          <div className="text-gray-500 font-bold dark:text-gray-400 mt-1 uppercase text-[10px] tracking-wider">Confirmed</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-slate-800 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending</div>
          </div>
          <div className="text-3xl font-black text-orange-600">{stats.pendingBookings}</div>
          <div className="text-gray-500 font-bold dark:text-gray-400 mt-1 uppercase text-[10px] tracking-wider">To Confirm</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-slate-800 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Revenue</div>
          </div>
          <div className="text-3xl font-black text-primary">₱{stats.totalRevenue.toLocaleString()}</div>
          <div className="text-gray-500 font-bold dark:text-gray-400 mt-1 uppercase text-[10px] tracking-wider">Total Stays</div>
        </div>
      </div>

      {/* Management Cards */}
      <div className="grid md:grid-cols-3 gap-8">
        <Link href="/admin/bookings">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group border border-gray-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-4xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-500 text-blue-600 drop-shadow-sm">
              <Calendar className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-center text-accent dark:text-white mb-3 tracking-tight">
              Manage Bookings
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center leading-relaxed font-medium">
              View, confirm, and manage guest reservations and schedules.
            </p>
            <div className="mt-8 flex justify-center">
              <div className="px-6 py-2 bg-gray-50 dark:bg-slate-800 text-primary font-bold rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-300 flex items-center gap-2">
                Manage <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/products">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group border border-gray-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center text-4xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-500 text-emerald-600 drop-shadow-sm">
              <Hotel className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-center text-accent dark:text-white mb-3 tracking-tight">
              Manage Products
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center leading-relaxed font-medium">
              Add, edit, and manage rooms, amenities and seasonal add-ons.
            </p>
            <div className="mt-8 flex justify-center">
              <div className="px-6 py-2 bg-gray-50 dark:bg-slate-800 text-emerald-600 font-bold rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 flex items-center gap-2">
                Inventory <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>

        <Link href="/admin/staff">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm p-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer group border border-gray-100 dark:border-slate-800">
            <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-3xl flex items-center justify-center text-4xl mb-6 mx-auto group-hover:scale-110 transition-transform duration-500 text-purple-600 drop-shadow-sm">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-center text-accent dark:text-white mb-3 tracking-tight">
              Manage Staff
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-center leading-relaxed font-medium">
              Set permissions and manage user accounts for your team.
            </p>
            <div className="mt-8 flex justify-center">
              <div className="px-6 py-2 bg-gray-50 dark:bg-slate-800 text-purple-600 font-bold rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 flex items-center gap-2">
                Team <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm p-8 border border-gray-100 dark:border-slate-800">
        <h3 className="text-2xl font-black text-accent dark:text-white mb-6 px-4 tracking-tight">Quick Actions</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/" className="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-3xl hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-300 group border border-transparent hover:border-primary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-800 shadow-sm rounded-2xl group-hover:scale-110 transition-transform text-primary">
                <Globe className="w-6 h-6" />
              </div>
              <p className="font-black text-accent dark:text-white">View Website</p>
            </div>
          </Link>
          <Link href="/admin/audit" className="p-6 bg-gray-50 dark:bg-slate-800/50 rounded-3xl hover:bg-secondary/10 dark:hover:bg-secondary/20 transition-all duration-300 group border border-transparent hover:border-secondary/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-800 shadow-sm rounded-2xl group-hover:scale-110 transition-transform text-secondary">
                <Search className="w-6 h-6" />
              </div>
              <p className="font-black text-accent dark:text-white">Audit Logs</p>
            </div>
          </Link>
          <Link href="/admin/bookings/new" className="p-6 bg-primary/5 dark:bg-primary/10 rounded-3xl hover:bg-primary/20 transition-all duration-300 group border border-transparent hover:border-primary/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary text-white shadow-lg shadow-primary/20 rounded-2xl group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <p className="font-black text-primary">New Booking</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
