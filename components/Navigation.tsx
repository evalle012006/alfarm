'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-16 h-16 relative">
              <Image
                src="/logo.png"
                alt="AlFarm Resort Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="hidden md:block">
              <h1 className="text-2xl font-bold text-accent">AlFarm</h1>
              <p className="text-sm text-gray-600">Resort & Adventure Park</p>
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-primary font-medium transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-primary font-medium transition-colors">
              About
            </Link>
            <Link href="/rooms" className="text-gray-700 hover:text-primary font-medium transition-colors">
              Accommodations
            </Link>
            <Link href="/activities" className="text-gray-700 hover:text-primary font-medium transition-colors">
              Activities
            </Link>
            <Link href="/gallery" className="text-gray-700 hover:text-primary font-medium transition-colors">
              Gallery
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-primary font-medium transition-colors">
              Contact
            </Link>
            <Link href="/guest/login" className="btn-primary text-sm">
              Book Now
            </Link>
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
              <Link href="/" className="text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
                About
              </Link>
              <Link href="/rooms" className="text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
                Accommodations
              </Link>
              <Link href="/activities" className="text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
                Activities
              </Link>
              <Link href="/gallery" className="text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
                Gallery
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-primary font-medium" onClick={() => setIsMenuOpen(false)}>
                Contact
              </Link>
              <Link href="/guest/login" className="btn-primary text-center" onClick={() => setIsMenuOpen(false)}>
                Book Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
