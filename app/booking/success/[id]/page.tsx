'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BookingStepper from '@/components/BookingStepper';
import Notification, { NotificationType } from '@/components/ui/Notification';
import { useAuth } from '@/lib/AuthContext';

interface BookingDetail {
  id: number;
  booking_date: string;
  check_out_date: string | null;
  booking_type: 'day' | 'overnight';
  booking_time: string | null;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  qr_code_hash: string | null;
  special_requests: string | null;
  guest: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    category: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  created_at: string;
}

function BookingSuccessContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const qrRef = useRef<HTMLDivElement>(null);

  const bookingId = params?.id ? Number(params.id) : NaN;
  const hashParam = searchParams.get('hash') || '';

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: NotificationType }>(
    { show: false, message: '', type: 'error' }
  );

  useEffect(() => {
    if (isNaN(bookingId) || bookingId < 1) {
      router.push('/');
      return;
    }

    async function loadBooking() {
      try {
        setLoading(true);
        const hashQuery = hashParam ? `?hash=${encodeURIComponent(hashParam)}` : '';
        const token = localStorage.getItem('alfarm_token');
        const res = await fetch(`/api/bookings/${bookingId}${hashQuery}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setBooking(data);
        } else {
          setNotification({
            show: true,
            message: 'Could not load booking details.',
            type: 'warning',
          });
        }
      } catch {
        setNotification({
          show: true,
          message: 'Failed to load booking details.',
          type: 'warning',
        });
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, hashParam, router]);

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
      const pngUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `alfarm-booking-${bookingId}-qr.png`;
      link.href = pngUrl;
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const qrValue = booking?.qr_code_hash
    ? `ALFARM-BK-${booking.id}-${booking.qr_code_hash}`
    : `ALFARM-BK-${bookingId}`;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const paymentMethodLabel = (method: string) => {
    switch (method) {
      case 'gcash': return 'GCash';
      case 'paymaya': return 'PayMaya';
      case 'cash': return 'Cash on Arrival';
      case 'stripe': return 'Paid Online';
      default: return method;
    }
  };

  const isStripePaid = booking?.payment_method === 'stripe' && booking?.payment_status === 'paid';

  return (
    <>
      <Navigation />

      <Notification
        isVisible={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />

      {/* Hero */}
      <section className="py-16 bg-gradient-to-br from-primary/10 via-white to-secondary/10 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-accent dark:text-white mb-3">
              {isStripePaid ? 'Booking Confirmed & Paid!' : 'Booking Submitted!'}
            </h1>
            <div className="max-w-2xl mx-auto mb-4">
              <BookingStepper current="done" />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {isStripePaid
                ? <>Your reservation <span className="font-bold text-primary">#{bookingId}</span> is confirmed. Payment received &mdash; you&apos;re all set!</>
                : <>Your reservation <span className="font-bold text-primary">#{bookingId}</span> has been created successfully.</>
              }
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 max-w-5xl">
          {loading && (
            <div className="py-16 text-center">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading booking details...</p>
            </div>
          )}

          {!loading && booking && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column — Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Visit Details */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-accent dark:text-white">Visit Details</h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Booking Type</div>
                      <div className="font-semibold text-accent dark:text-white capitalize">
                        {booking.booking_type === 'overnight' ? 'Overnight Stay' : 'Day Use'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                      <div className="font-semibold text-accent dark:text-white capitalize">{booking.status}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        {booking.booking_type === 'overnight' ? 'Check-in' : 'Date'}
                      </div>
                      <div className="font-semibold text-accent dark:text-white">
                        {formatDate(booking.booking_date)}
                      </div>
                    </div>
                    {booking.booking_type === 'overnight' && booking.check_out_date && (
                      <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Check-out</div>
                        <div className="font-semibold text-accent dark:text-white">
                          {formatDate(booking.check_out_date)}
                        </div>
                      </div>
                    )}
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Method</div>
                      <div className="font-semibold text-accent dark:text-white">
                        {paymentMethodLabel(booking.payment_method)}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payment Status</div>
                      <div className="font-semibold text-accent dark:text-white capitalize">{booking.payment_status}</div>
                    </div>
                  </div>
                </div>

                {/* Reserved Items */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-accent dark:text-white">Reserved Items</h2>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-slate-800">
                    {booking.items.map((item) => (
                      <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-accent dark:text-white">{item.product_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.category} &middot; Qty {item.quantity} &times; &#8369;{item.unit_price.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-primary whitespace-nowrap">
                          &#8369;{item.subtotal.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-slate-700 flex justify-between items-end">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Total Amount</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      &#8369;{booking.total_amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Guest Info */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-accent dark:text-white">Guest Information</h2>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Name</div>
                      <div className="font-semibold text-accent dark:text-white">
                        {booking.guest.first_name} {booking.guest.last_name}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</div>
                      <div className="font-semibold text-accent dark:text-white">{booking.guest.phone}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 sm:col-span-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email</div>
                      <div className="font-semibold text-accent dark:text-white break-all">{booking.guest.email}</div>
                    </div>
                  </div>

                  {booking.special_requests && (
                    <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">Special Requests</div>
                      <div className="text-sm text-gray-700 dark:text-gray-300">{booking.special_requests}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column — QR + Actions */}
              <div className="space-y-6">
                {/* QR Code Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6 text-center">
                  <h3 className="text-lg font-bold text-accent dark:text-white mb-2">Your Booking QR</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                    Present this QR code at the resort entrance for quick check-in.
                  </p>

                  <div ref={qrRef} className="inline-block bg-white p-4 rounded-xl shadow-inner">
                    <QRCode
                      value={qrValue}
                      size={180}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#1a1a2e"
                    />
                  </div>

                  <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 font-mono break-all">
                    Ref: #{bookingId}
                  </p>

                  <button
                    onClick={handleDownloadQR}
                    className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download QR Code
                  </button>
                </div>

                {/* Register CTA (only for non-authenticated users) */}
                {!isAuthenticated && (
                  <div className="bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-2xl border-2 border-primary/20 dark:border-primary/30 p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-accent dark:text-white mb-2">Save Your Booking History</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Register an account to track all your bookings, get faster check-in, and receive exclusive offers.
                    </p>
                    <Link
                      href="/guest/register"
                      className="inline-block w-full px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-600 text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all duration-200 text-center"
                    >
                      Register Now
                    </Link>
                  </div>
                )}

                {/* Navigation Links */}
                <div className="space-y-3">
                  <Link
                    href="/"
                    className="block w-full px-6 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all duration-200 text-center"
                  >
                    Back to Home
                  </Link>
                  {isAuthenticated && (
                    <Link
                      href="/guest/dashboard"
                      className="block w-full px-6 py-3 rounded-xl border-2 border-primary/30 bg-primary/5 dark:bg-primary/10 text-primary font-semibold hover:bg-primary/10 dark:hover:bg-primary/20 transition-all duration-200 text-center"
                    >
                      Go to Dashboard
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fallback if booking not found */}
          {!loading && !booking && (
            <div className="max-w-lg mx-auto text-center py-16">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-accent dark:text-white mb-2">Booking Created</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your booking <strong>#{bookingId}</strong> has been placed. Save this reference number for your records.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/" className="btn-outline px-6 py-3 text-center">
                  Back to Home
                </Link>
                {!isAuthenticated && (
                  <Link href="/guest/register" className="btn-primary px-6 py-3 text-center">
                    Register to Track Bookings
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <BookingSuccessContent />
    </Suspense>
  );
}
