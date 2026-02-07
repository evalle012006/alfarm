'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BookingStepper from '@/components/BookingStepper';
import Notification, { NotificationType } from '@/components/ui/Notification';
import { useBooking } from '@/lib/BookingContext';

interface BookingHistoryItem {
  id: number;
  booking_date: string;
  check_out_date: string | null;
  booking_type: 'day' | 'overnight';
  booking_time: string | null;
  status: string;
  payment_status: string;
  total_amount: number;
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

export default function BookingConfirmationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useBooking();

  const bookingId = useMemo(() => {
    const id = params?.id ? Number(params.id) : NaN;
    return isNaN(id) ? null : id;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingHistoryItem | null>(null);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: NotificationType }>(
    { show: false, message: '', type: 'error' }
  );

  useEffect(() => {
    if (!bookingId) {
      router.push('/');
      return;
    }

    async function loadBooking() {
      try {
        setLoading(true);
        // Best-effort: if user is logged in, booking will appear in history; if not, we still show a confirmation
        const token = localStorage.getItem('token');

        if (token) {
          const res = await fetch('/api/bookings/history?limit=50', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            const match = (data.bookings || []).find((b: BookingHistoryItem) => b.id === bookingId);
            if (match) {
              setBooking(match);
            }
          }
        }
      } catch (err) {
        setNotification({
          show: true,
          message: err instanceof Error ? err.message : 'Failed to load booking details',
          type: 'warning',
        });
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, router]);

  const totalAmount = booking?.total_amount ?? state.lastBookingTotalAmount ?? null;

  return (
    <>
      <Navigation />

      <Notification
        isVisible={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification((prev) => ({ ...prev, show: false }))}
      />

      <section className="py-16 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <h1 className="section-title mb-3">Booking Confirmed</h1>
            <div className="max-w-2xl mx-auto mb-6">
              <BookingStepper current="done" />
            </div>
            <p className="section-subtitle mb-4">Your booking has been created successfully.</p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gray-50 dark:bg-accent-dark/70 rounded-2xl shadow-xl p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-300">Reference</p>
                <div className="text-3xl font-bold text-primary">#{bookingId}</div>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm text-gray-500 dark:text-gray-300">Total</p>
                <div className="text-2xl font-bold text-accent dark:text-white">
                  {totalAmount !== null ? `₱${Number(totalAmount).toLocaleString()}` : '—'}
                </div>
              </div>
            </div>

            {loading && (
              <div className="py-8 text-center text-gray-600 dark:text-gray-300">Loading booking details...</div>
            )}

            {!loading && booking && (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-700">
                  <h3 className="font-semibold text-accent dark:text-white mb-2">Visit Details</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <div>
                      <strong>Type:</strong> {booking.booking_type === 'overnight' ? 'Overnight' : 'Day Use'}
                    </div>
                    <div>
                      <strong>{booking.booking_type === 'overnight' ? 'Check-in' : 'Date'}:</strong>{' '}
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </div>
                    {booking.booking_type === 'overnight' && booking.check_out_date && (
                      <div>
                        <strong>Check-out:</strong> {new Date(booking.check_out_date).toLocaleDateString()}
                      </div>
                    )}
                    <div>
                      <strong>Status:</strong> {booking.status}
                    </div>
                    <div>
                      <strong>Payment:</strong> {booking.payment_status}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-700">
                  <h3 className="font-semibold text-accent dark:text-white mb-2">Reserved Items</h3>
                  <div className="divide-y divide-gray-200 dark:divide-slate-700">
                    {booking.items.map((it) => (
                      <div key={it.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-accent dark:text-white truncate">{it.product_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-300">
                            {it.category} · Qty {it.quantity}
                          </div>
                        </div>
                        <div className="text-sm font-bold text-primary">₱{Number(it.subtotal).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-700">
                  <h3 className="font-semibold text-accent dark:text-white mb-2">Guest</h3>
                  <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <div>
                      <strong>Name:</strong> {booking.guest.first_name} {booking.guest.last_name}
                    </div>
                    <div>
                      <strong>Email:</strong> {booking.guest.email}
                    </div>
                    <div>
                      <strong>Phone:</strong> {booking.guest.phone}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!loading && !booking && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="font-semibold text-accent dark:text-white mb-1">You’re all set!</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  We sent a confirmation email if Mailtrap/SMTP is configured. Save your reference number: <strong>#{bookingId}</strong>.
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="btn-outline w-full sm:w-auto text-center">
                Back to Home
              </Link>
              <Link href="/booking/results" className="btn-secondary w-full sm:w-auto text-center">
                Book Again
              </Link>
              <Link href="/guest/dashboard" className="btn-primary w-full sm:w-auto text-center">
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
