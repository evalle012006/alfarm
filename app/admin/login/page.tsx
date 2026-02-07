'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Admin Login Page
 * 
 * Uses cookie-based authentication (httpOnly cookie set by server).
 * Does NOT use AuthContext - admin auth is separate from guest auth.
 */
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
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          // NOTE: role is intentionally NOT sent - server determines from DB
        }),
        credentials: 'include', // Important: include cookies in request/response
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Check if this is an admin login response (has 'ok' field, no 'token' field)
      if (data.ok && data.user) {
        // Admin login successful - cookie is set by server
        // Redirect to dashboard
        router.push('/admin/dashboard');
        return;
      }

      // If we got a token in response, this is a guest account trying to login
      // Guest accounts should not be able to access admin
      if (data.token) {
        setError('Invalid credentials');
        setLoading(false);
        return;
      }

      // Unexpected response
      setError('Login failed');
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    }
    
    setLoading(false);
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
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
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
