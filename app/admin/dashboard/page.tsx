'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    totalBookings: 0,
    totalRooms: 7, // From our schema
    availableRooms: 7,
    pendingBookings: 0,
    totalGuests: 0,
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/admin/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'root' && parsedUser.role !== 'admin') {
      router.push('/');
      return;
    }

    setUser(parsedUser);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-5xl mb-4">⏳</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-accent text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 relative">
                <Image
                  src="/logo.png"
                  alt="AlFarm Logo"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">AlFarm Admin Dashboard</h1>
                <p className="text-sm text-gray-300">Resort Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="font-semibold">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-gray-300 capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-xl p-8 mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user.firstName}!</h2>
          <p className="text-white/90">Here's your resort overview for today</p>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">📊</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.totalBookings}</div>
            <div className="text-gray-600 mt-1">Bookings</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">🏨</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.totalRooms}</div>
            <div className="text-gray-600 mt-1">Rooms</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">✅</div>
              <div className="text-sm text-gray-500">Status</div>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.availableRooms}</div>
            <div className="text-gray-600 mt-1">Available</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">⏳</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="text-3xl font-bold text-orange-600">{stats.pendingBookings}</div>
            <div className="text-gray-600 mt-1">To Confirm</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">👥</div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
            <div className="text-3xl font-bold text-primary">{stats.totalGuests}</div>
            <div className="text-gray-600 mt-1">Guests</div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <Link href="/admin/bookings">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">📅</div>
              <h3 className="text-2xl font-bold text-center text-accent mb-3">
                Manage Bookings
              </h3>
              <p className="text-gray-600 text-center">
                View, confirm, and manage guest reservations
              </p>
              <div className="mt-4 text-center">
                <span className="text-primary font-semibold group-hover:underline">
                  View Details →
                </span>
              </div>
            </div>
          </Link>

          <Link href="/admin/rooms">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">🛏️</div>
              <h3 className="text-2xl font-bold text-center text-accent mb-3">
                Manage Rooms
              </h3>
              <p className="text-gray-600 text-center">
                Add, edit, and manage room inventory and pricing
              </p>
              <div className="mt-4 text-center">
                <span className="text-primary font-semibold group-hover:underline">
                  View Details →
                </span>
              </div>
            </div>
          </Link>

          <Link href="/admin/amenities">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">⭐</div>
              <h3 className="text-2xl font-bold text-center text-accent mb-3">
                Manage Amenities
              </h3>
              <p className="text-gray-600 text-center">
                Configure resort amenities and room features
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
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-accent mb-4">Quick Actions</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <Link href="/" className="p-4 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors text-center">
              <div className="text-3xl mb-2">🌐</div>
              <p className="font-semibold text-accent">View Website</p>
            </Link>
            <Link href="/admin/reports" className="p-4 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors text-center">
              <div className="text-3xl mb-2">📈</div>
              <p className="font-semibold text-accent">View Reports</p>
            </Link>
            <Link href="/admin/guests" className="p-4 bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors text-center">
              <div className="text-3xl mb-2">👤</div>
              <p className="font-semibold text-accent">Guest List</p>
            </Link>
            <Link href="/admin/settings" className="p-4 bg-secondary/10 rounded-lg hover:bg-secondary/20 transition-colors text-center">
              <div className="text-3xl mb-2">⚙️</div>
              <p className="font-semibold text-accent">Settings</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
