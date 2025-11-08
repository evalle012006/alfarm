'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function GuestDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/guest/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
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
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient">
      {/* Header */}
      <header className="bg-white shadow-lg">
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
                <h1 className="text-2xl font-bold text-accent">My Dashboard</h1>
                <p className="text-sm text-gray-600">AlFarm Resort</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden md:block">
                <p className="font-semibold text-accent">{user.firstName} {user.lastName}</p>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
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
          <h2 className="text-3xl font-bold mb-2">Welcome, {user.firstName}!</h2>
          <p className="text-white/90">Manage your bookings and explore amazing experiences</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <Link href="/rooms">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">🏨</div>
              <h3 className="text-2xl font-bold text-center text-accent mb-3">
                Browse Rooms
              </h3>
              <p className="text-gray-600 text-center">
                Explore our accommodations and make a new reservation
              </p>
              <div className="mt-4 text-center">
                <span className="text-primary font-semibold group-hover:underline">
                  View Rooms →
                </span>
              </div>
            </div>
          </Link>

          <Link href="/activities">
            <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group">
              <div className="text-6xl mb-4 text-center group-hover:scale-110 transition-transform">🪂</div>
              <h3 className="text-2xl font-bold text-center text-accent mb-3">
                Explore Activities
              </h3>
              <p className="text-gray-600 text-center">
                Discover exciting adventures and experiences
              </p>
              <div className="mt-4 text-center">
                <span className="text-primary font-semibold group-hover:underline">
                  View Activities →
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-accent mb-6">My Profile</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
              <p className="text-lg font-semibold text-accent">{user.firstName} {user.lastName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <p className="text-lg font-semibold text-accent">{user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
              <p className="text-lg font-semibold text-accent">{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Member Since</label>
              <p className="text-lg font-semibold text-accent">Just joined!</p>
            </div>
          </div>
        </div>

        {/* My Bookings Section */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-accent mb-6">My Bookings</h3>
          
          <div className="text-center py-12 text-gray-600">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-lg mb-2">No bookings yet</p>
            <p className="text-sm text-gray-500 mb-6">
              Start your adventure by booking a room!
            </p>
            <Link href="/rooms" className="btn-primary inline-block">
              Browse Rooms
            </Link>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid md:grid-cols-4 gap-4">
          <Link href="/" className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center">
            <div className="text-3xl mb-2">🏠</div>
            <p className="font-semibold text-accent">Home</p>
          </Link>
          <Link href="/about" className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center">
            <div className="text-3xl mb-2">ℹ️</div>
            <p className="font-semibold text-accent">About Us</p>
          </Link>
          <Link href="/gallery" className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center">
            <div className="text-3xl mb-2">📷</div>
            <p className="font-semibold text-accent">Gallery</p>
          </Link>
          <Link href="/contact" className="p-4 bg-white rounded-lg shadow hover:shadow-lg transition-shadow text-center">
            <div className="text-3xl mb-2">📞</div>
            <p className="font-semibold text-accent">Contact</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
