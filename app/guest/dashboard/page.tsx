'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import BookingCard from '@/components/booking/BookingCard';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import {
  Calendar,
  RefreshCw,
  ArrowRight,
  Home,
  Zap,
  User,
  LogOut,
  AlertCircle,
  TriangleAlert
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface UserData {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
}

interface Booking {
  id: string | number;
  booking_date: string;
  check_out_date?: string;
  booking_type: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'checked_in' | 'checked_out';
  payment_status: string;
  total_amount: number;
  items: any[];
}

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

export default function GuestDashboard() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [cancellingId, setCancellingId] = useState<string | number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [targetBookingId, setTargetBookingId] = useState<string | number | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchBookings = useCallback(async (filter = activeFilter) => {
    if (!token) return;

    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (filter) params.set('status', filter);

      const bookingsRes = await fetch(`/api/bookings/history?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.bookings);
      } else if (bookingsRes.status === 401) {
        // Auth session expired or invalid
        router.push('/guest/login');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Could not load your bookings');
    } finally {
      setIsLoading(false);
    }
  }, [token, router, activeFilter]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/guest/login');
      return;
    }

    if (isAuthenticated && token) {
      fetchBookings();
    }
  }, [isAuthenticated, authLoading, token, fetchBookings, router]);

  const handleCancelBooking = (bookingId: string | number) => {
    setTargetBookingId(bookingId);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!targetBookingId || !token) return;

    try {
      setCancellingId(targetBookingId);
      setShowCancelModal(false);
      const res = await fetch(`/api/bookings/${targetBookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      if (res.ok) {
        toast.success('Booking cancelled successfully');
        fetchBookings();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to cancel booking');
      }
    } catch (error) {
      toast.error('An error occurred during cancellation');
    } finally {
      setCancellingId(null);
      setTargetBookingId(null);
    }
  };

  if (!user && isLoading) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm font-black text-primary uppercase tracking-[0.3em]">Synchronizing...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      title="Guest Passport"
    >
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-accent to-slate-900 text-white rounded-[2.5rem] p-8 mb-10 shadow-2xl shadow-accent/20">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <User className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-3">Welcome Traveler</p>
          <h2 className="text-4xl font-black mb-2 tracking-tight">Bonjour, {user?.firstName}!</h2>
          <p className="text-sm font-bold opacity-70 uppercase tracking-widest max-w-md">Your gateway to AlFarm Resort experiences and stay management.</p>
        </div>
      </div>

      {/* Bookings Header & Filter */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-accent dark:text-white uppercase tracking-tight flex items-center gap-3">
              <Calendar className="w-6 h-6 text-primary" />
              Recent Bookings
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 pl-9">Manage your upcoming and past stays</p>
          </div>

          <button
            onClick={() => fetchBookings()}
            className="p-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl hover:bg-gray-50 transition-all group"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 group-hover:text-primary transition-colors ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-gray-100 dark:bg-slate-900 rounded-2xl w-fit">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === filter.value
                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
                }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Booking Cards Grid */}
        <div className="grid gap-6">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-100 dark:bg-slate-900 rounded-[2.5rem] h-48"></div>
            ))
          ) : bookings.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
              <div className="w-20 h-20 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-gray-200 dark:text-slate-700" />
              </div>
              <h3 className="text-xl font-black text-accent dark:text-white uppercase tracking-tight mb-2">No bookings yet</h3>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Ready for your next adventure?</p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-black rounded-2xl hover:bg-primary-600 transition-all shadow-xl shadow-primary/20 uppercase tracking-widest text-xs"
              >
                Book Now
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                {...booking}
                id={booking.id}
                price={booking.total_amount}
                onCancel={handleCancelBooking}
                isCancelling={cancellingId === booking.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Quick Actions / Explore */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Link href="/rooms" className="group">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 hover:border-primary/30 transition-all h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Home className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-black text-accent dark:text-white uppercase tracking-tight">Luxury Rooms</h3>
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed mb-6">Discover our curated selection of premium accommodations.</p>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2 group-hover:translate-x-2 transition-transform">
              Browse Rooms <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>

        <Link href="/activities" className="group">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 hover:border-secondary/30 transition-all h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap className="w-24 h-24" />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 bg-secondary/10 rounded-2xl">
                <Zap className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-black text-accent dark:text-white uppercase tracking-tight">Activities</h3>
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest leading-relaxed mb-6">Elevate your stay with our exclusive resort experiences.</p>
            <span className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] flex items-center gap-2 group-hover:translate-x-2 transition-transform">
              View Activities <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </Link>
      </div>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Booking"
        size="sm"
      >
        <div className="text-center">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <TriangleAlert className="w-10 h-10 text-red-500" strokeWidth={2.5} />
          </div>

          <p className="text-lg font-bold text-accent dark:text-white uppercase tracking-tight mb-3">Confirm Cancellation</p>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Are you sure you want to cancel booking <span className="text-primary font-black font-mono">#{targetBookingId}</span>?
            This action will release your reserved dates and cannot be undone.
          </p>

          <div className="mb-8 text-left">
            <label htmlFor="cancelReason" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Reason for Cancellation (Optional)
            </label>
            <textarea
              id="cancelReason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Tell us why you're cancelling..."
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-accent dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 py-4 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-accent dark:text-white font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
            >
              Keep Booking
            </button>
            <button
              onClick={confirmCancelBooking}
              className="flex-1 py-4 bg-transparent border-2 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 font-black rounded-2xl transition-all uppercase tracking-widest text-[10px]"
            >
              Yes, Cancel
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
