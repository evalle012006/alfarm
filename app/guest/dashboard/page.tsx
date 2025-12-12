'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import BookingCard from '@/components/booking/BookingCard';

// Mock data - in a real app, this would come from an API
const mockBookings = [
  {
    id: '1',
    title: 'Deluxe Family Room',
    date: 'Jun 15 - 18, 2023',
    guests: 4,
    price: 4500,
    status: 'confirmed' as const,
    imageUrl: '/images/rooms/deluxe-family.jpg',
  },
  {
    id: '2',
    title: 'Couples Package',
    date: 'Jul 1 - 3, 2023',
    guests: 2,
    price: 3500,
    status: 'pending' as const,
    imageUrl: '/images/rooms/couples-package.jpg',
  },
  {
    id: '3',
    title: 'Weekend Getaway',
    date: 'May 10 - 12, 2023',
    guests: 2,
    price: 2800,
    status: 'completed' as const,
    imageUrl: '/images/rooms/weekend-getaway.jpg',
  },
];

export default function GuestDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<typeof mockBookings>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/guest/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    
    // Simulate API call to fetch bookings
    const timer = setTimeout(() => {
      setBookings(mockBookings);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center hero-gradient">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-gray-600 dark:text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout 
      title="My Bookings"
      headerAction={
        <Link 
          href="/booking"
          className="btn-primary inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Booking
        </Link>
      }
    >
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-1">Welcome back, {user.firstName}!</h2>
        <p className="opacity-90">Here's an overview of your bookings and activities.</p>
      </div>

      {/* Bookings Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Bookings</h2>
          <Link 
            href="/guest/bookings" 
            className="text-sm font-medium text-primary hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-400"
          >
            View All →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-gray-200 dark:bg-slate-700 rounded-lg h-32"></div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bookings yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">You haven't made any bookings yet.</p>
            <Link 
              href="/booking"
              className="btn-primary inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Book Now
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.slice(0, 3).map((booking) => (
              <BookingCard key={booking.id} {...booking} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link href="/rooms">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg mr-4">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Explore Accommodations</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 flex-grow">Discover our range of comfortable rooms and unique stays for your next getaway.</p>
            <div className="mt-4 text-primary-600 dark:text-primary-400 font-medium inline-flex items-center">
              Browse Rooms
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/activities">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg mr-4">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Activities & Experiences</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 flex-grow">Enhance your stay with our exciting activities and local experiences.</p>
            <div className="mt-4 text-green-600 dark:text-green-400 font-medium inline-flex items-center">
              View Activities
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </DashboardLayout>
  );
}
