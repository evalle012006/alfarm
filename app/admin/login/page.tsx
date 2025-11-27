'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'root' }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/admin/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent to-accent-light flex items-center justify-center px-4 dark:from-accent-dark dark:to-primary-900">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-2xl p-8 dark:bg-accent-dark dark:text-white">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 relative">
                <Image
                  src="/logo.png"
                  alt="AlFarm Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-accent dark:text-white">Admin Portal</h2>
            <p className="text-gray-600 mt-2 dark:text-white">AlFarm Resort Management</p>
          </div>

          {error && (
            <div className="bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
                Email Address
              </label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="admin@alfarm.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                className="input-field"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent text-white py-3 rounded-lg hover:bg-accent-light transition-colors disabled:bg-gray-400 font-semibold"
            >
              {loading ? 'Logging in...' : 'Login to Dashboard'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-sm text-gray-600 dark:text-white">
              <p className="mb-2">Default credentials for testing:</p>
              <p className="font-mono bg-gray-100 p-2 rounded">admin@alfarm.com</p>
              <p className="font-mono bg-gray-100 p-2 rounded mt-1">admin123</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link href="/" className="text-primary hover:underline">
              ← Back to Website
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-4 text-center text-white text-sm">
          <p>🔒 Secure admin access only</p>
        </div>
      </div>
    </div>
  );
}
