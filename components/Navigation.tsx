'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push('/');
  };

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const stored = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const initial: 'light' | 'dark' =
      stored === 'dark' || (!stored && prefersDark) ? 'dark' : 'light';

    setTheme(initial);
    if (initial === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next: 'light' | 'dark' = theme === 'light' ? 'dark' : 'light';
    setTheme(next);

    if (typeof window !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      window.localStorage.setItem('theme', next);
    }
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 dark:bg-accent-dark/95 dark:text-gray-100">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-16 h-16 relative rounded-full overflow-hidden">
              <Image
                src="/logo.png"
                alt="AlFarm Resort Logo"
                fill
                className="object-cover"
              />
            </div>
            <div className="block">
              <h1 className="text-2xl font-bold text-accent dark:text-white">AlFarm</h1>
              <p className="text-sm text-gray-600 dark:text-white">Resort & Adventure Park</p>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`font-medium transition-colors border-b-2 pb-1 ${
                isActive('/')
                  ? 'text-primary dark:text-white border-primary'
                  : 'text-gray-700 dark:text-white border-transparent hover:text-primary hover:border-primary/50'
              }`}
            >
              Home
            </Link>
            <Link
              href="/about"
              className={`font-medium transition-colors border-b-2 pb-1 ${
                isActive('/about')
                  ? 'text-primary dark:text-white border-primary'
                  : 'text-gray-700 dark:text-white border-transparent hover:text-primary hover:border-primary/50'
              }`}
            >
              About
            </Link>
            <Link
              href="/rooms"
              className={`font-medium transition-colors border-b-2 pb-1 ${
                isActive('/rooms')
                  ? 'text-primary dark:text-white border-primary'
                  : 'text-gray-700 dark:text-white border-transparent hover:text-primary hover:border-primary/50'
              }`}
            >
              Accommodations
            </Link>
            <Link
              href="/activities"
              className={`font-medium transition-colors border-b-2 pb-1 ${
                isActive('/activities')
                  ? 'text-primary dark:text-white border-primary'
                  : 'text-gray-700 dark:text-white border-transparent hover:text-primary hover:border-primary/50'
              }`}
            >
              Activities
            </Link>
            <Link
              href="/gallery"
              className={`font-medium transition-colors border-b-2 pb-1 ${
                isActive('/gallery')
                  ? 'text-primary dark:text-white border-primary'
                  : 'text-gray-700 dark:text-white border-transparent hover:text-primary hover:border-primary/50'
              }`}
            >
              Gallery
            </Link>
            <Link
              href="/contact"
              className={`font-medium transition-colors border-b-2 pb-1 ${
                isActive('/contact')
                  ? 'text-primary dark:text-white border-primary'
                  : 'text-gray-700 dark:text-white border-transparent hover:text-primary hover:border-primary/50'
              }`}
            >
              Contact
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors transition-transform duration-300 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-accent-dark"
            >
              <span
                className={`inline-block transform transition-transform duration-300 ${
                  theme === 'dark' ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
                }`}
              >
                {theme === 'dark' ? '🌙' : '☀️'}
              </span>
            </button>
            
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <span className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </span>
                  <span className="text-sm font-medium text-gray-700 dark:text-white hidden lg:block">
                    {user.firstName}
                  </span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50 dark:bg-slate-800 dark:border-slate-700">
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                    <Link
                      href={user.role === 'guest' ? '/guest/dashboard' : '/admin/dashboard'}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-white dark:hover:bg-slate-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/guest/login" className="btn-primary text-sm">
                Book Now
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-gray-700 hover:text-primary"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className={`font-medium ${
                  isActive('/') ? 'text-primary dark:text-white' : 'text-gray-700 dark:text-white hover:text-primary'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/about"
                className={`font-medium ${
                  isActive('/about') ? 'text-primary dark:text-white' : 'text-gray-700 dark:text-white hover:text-primary'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/rooms"
                className={`font-medium ${
                  isActive('/rooms') ? 'text-primary dark:text-white' : 'text-gray-700 dark:text-white hover:text-primary'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Accommodations
              </Link>
              <Link
                href="/activities"
                className={`font-medium ${
                  isActive('/activities') ? 'text-primary dark:text-white' : 'text-gray-700 dark:text-white hover:text-primary'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Activities
              </Link>
              <Link
                href="/gallery"
                className={`font-medium ${
                  isActive('/gallery') ? 'text-primary dark:text-white' : 'text-gray-700 dark:text-white hover:text-primary'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Gallery
              </Link>
              <Link
                href="/contact"
                className={`font-medium ${
                  isActive('/contact') ? 'text-primary dark:text-white' : 'text-gray-700 dark:text-white hover:text-primary'
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>
              {isAuthenticated && user ? (
                <>
                  <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <Link
                    href={user.role === 'guest' ? '/guest/dashboard' : '/admin/dashboard'}
                    className="font-medium text-primary"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                    className="font-medium text-red-600 text-left"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/guest/login"
                  className="btn-primary text-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Book Now
                </Link>
              )}
              <button
                type="button"
                onClick={toggleTheme}
                className="mt-2 inline-flex items-center justify-center gap-2 self-start rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 transition-colors transition-transform duration-300 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-accent-dark"
              >
                <span>{theme === 'dark' ? 'Night mode' : 'Light mode'}</span>
                <span
                  className={`inline-block transform transition-transform duration-300 ${
                    theme === 'dark' ? 'rotate-180 scale-110' : 'rotate-0 scale-100'
                  }`}
                >
                  {theme === 'dark' ? '🌙' : '☀️'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
