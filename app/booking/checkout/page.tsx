'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Notification, { NotificationType } from '@/components/ui/Notification';
import BookingStepper from '@/components/BookingStepper';
import { getBookingCartItems, useBooking } from '@/lib/BookingContext';

interface ProductOption {
  id: number;
  title: string;
  pricePerNight: number;
  capacity: string[];
  description: string;
  type: string;
  category: string;
}

type FeeKind = 'adult' | 'child';

export default function BookingCheckoutPage() {
  const router = useRouter();
  const { state, setPaymentMethod, setConfirmation, reset } = useBooking();

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [notification, setNotification] = useState<{ show: boolean; message: string; type: NotificationType }>(
    { show: false, message: '', type: 'error' }
  );

  const cartItems = useMemo(() => getBookingCartItems(state.cart), [state.cart]);

  const numNights = useMemo(() => {
    if (state.bookingType !== 'overnight' || !state.checkInDate || !state.checkOutDate) return 1;
    return Math.ceil(
      (new Date(state.checkOutDate).getTime() - new Date(state.checkInDate).getTime()) / (1000 * 60 * 60 * 24)
    );
  }, [state.bookingType, state.checkInDate, state.checkOutDate]);

  useEffect(() => {
    // Guard: require previous steps
    if (!state.checkInDate) {
      router.push('/');
      return;
    }

    if (state.bookingType === 'overnight' && !state.checkOutDate) {
      router.push('/');
      return;
    }

    if (cartItems.length === 0) {
      router.push('/booking/results');
      return;
    }

    if (!state.guestInfo) {
      router.push('/booking/info');
      return;
    }
  }, [cartItems.length, router, state.bookingType, state.checkInDate, state.checkOutDate, state.guestInfo]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoadingProducts(true);
        const res = await fetch('/api/products');
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        setNotification({
          show: true,
          message: err instanceof Error ? err.message : 'Failed to load products',
          type: 'error',
        });
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchProducts();
  }, []);

  const fees = useMemo(() => {
    const isNight = state.bookingType === 'overnight';

    const match = (kind: FeeKind) => {
      const token = kind === 'adult' ? 'Adult Entrance' : 'Kid Entrance';
      const slotToken = isNight ? '(Night)' : '(Day)';
      return products.find(
        (p) => p.category.includes('Entrance') && p.title.includes(token) && p.title.includes(slotToken)
      );
    };

    const adult = match('adult');
    const child = match('child');

    return {
      adult,
      child,
    };
  }, [products, state.bookingType]);

  const lineItems = useMemo(() => {
    const items: Array<{ id: number; title: string; qty: number; unit: number; subtotal: number; kind: 'cart' | 'fee' }> = [];

    for (const item of cartItems) {
      const p = products.find((x) => x.id === item.product_id);
      if (!p) continue;

      const isPerNight = p.type === 'room' && state.bookingType === 'overnight';
      const multiplier = isPerNight ? numNights : 1;
      const subtotal = p.pricePerNight * item.quantity * multiplier;

      items.push({
        id: p.id,
        title: p.title,
        qty: item.quantity,
        unit: p.pricePerNight,
        subtotal,
        kind: 'cart',
      });
    }

    if (fees.adult && state.adults > 0) {
      items.push({
        id: fees.adult.id,
        title: fees.adult.title,
        qty: state.adults,
        unit: fees.adult.pricePerNight,
        subtotal: fees.adult.pricePerNight * state.adults,
        kind: 'fee',
      });
    }

    if (fees.child && state.children > 0) {
      items.push({
        id: fees.child.id,
        title: fees.child.title,
        qty: state.children,
        unit: fees.child.pricePerNight,
        subtotal: fees.child.pricePerNight * state.children,
        kind: 'fee',
      });
    }

    return items;
  }, [cartItems, fees.adult, fees.child, numNights, products, state.adults, state.bookingType, state.children]);

  const totalAmount = useMemo(() => lineItems.reduce((sum, li) => sum + li.subtotal, 0), [lineItems]);

  const handlePlaceOrder = async () => {
    if (!state.guestInfo) {
      router.push('/booking/info');
      return;
    }

    if (!fees.adult || (state.children > 0 && !fees.child)) {
      setNotification({
        show: true,
        message:
          'Entrance fee products are missing from the database (Entrance Fee category). Please ensure schema seed data is applied.',
        type: 'error',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        guest_info: {
          first_name: state.guestInfo.firstName,
          last_name: state.guestInfo.lastName,
          email: state.guestInfo.email,
          phone: state.guestInfo.phone,
        },
        booking_date: state.checkInDate,
        check_out_date: state.bookingType === 'overnight' ? state.checkOutDate : null,
        booking_type: state.bookingType,
        items: lineItems.map((li) => ({ product_id: li.id, quantity: li.qty })),
        special_requests: state.specialRequests || null,
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create booking');
      }

      setConfirmation({ bookingId: data.booking_id, totalAmount: data.total_amount });

      // Show success state
      setBookingSuccess(true);
      setShowConfirmModal(false);

      // Redirect after showing success state
      setTimeout(() => {
        // Clear booking flow state but keep dates/guests for quick re-book
        reset({ keepSearch: true });
        router.push(`/booking/confirmation/${data.booking_id}`);
      }, 2000);
    } catch (err) {
      setNotification({
        show: true,
        message: err instanceof Error ? err.message : 'Failed to place order',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className="section-title mb-3">Checkout</h1>
            <div className="max-w-2xl mx-auto mb-6">
              <BookingStepper current="payment" />
            </div>
            <p className="section-subtitle mb-4">Review your booking and complete the demo payment.</p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gray-50 dark:bg-accent-dark/70 rounded-2xl shadow-xl p-6 md:p-8">
              <h2 className="text-2xl font-bold text-accent dark:text-white mb-4">Payment Method (Demo)</h2>

              <div className="grid md:grid-cols-3 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 rounded-xl border text-left transition-colors ${state.paymentMethod === 'cash'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                >
                  <div className="font-semibold text-accent dark:text-white">Cash on Arrival</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">Pay at check-in</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('gcash')}
                  className={`p-4 rounded-xl border text-left transition-colors ${state.paymentMethod === 'gcash'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                >
                  <div className="font-semibold text-accent dark:text-white">GCash (Demo)</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">Simulated payment</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paymaya')}
                  className={`p-4 rounded-xl border text-left transition-colors ${state.paymentMethod === 'paymaya'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                >
                  <div className="font-semibold text-accent dark:text-white">PayMaya (Demo)</div>
                  <div className="text-xs text-gray-500 dark:text-gray-300">Simulated payment</div>
                </button>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:bg-slate-900 dark:border-slate-700">
                <h3 className="font-semibold text-accent dark:text-white mb-2">Guest Details</h3>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div>
                    <strong>Name:</strong> {state.guestInfo?.firstName} {state.guestInfo?.lastName}
                  </div>
                  <div>
                    <strong>Email:</strong> {state.guestInfo?.email}
                  </div>
                  <div>
                    <strong>Phone:</strong> {state.guestInfo?.phone}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 dark:text-gray-300">
                  I agree to the resort house rules and cancellation policy. (Demo)
                </label>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/booking/info')}
                  className="btn-outline w-full sm:w-auto text-center"
                >
                  Back
                </button>
                <PrimaryButton
                  onClick={() => {
                    if (!termsAccepted) {
                      setNotification({
                        show: true,
                        message: 'Please accept the terms and cancellation policy before continuing.',
                        type: 'warning',
                      });
                      return;
                    }
                    setShowConfirmModal(true);
                  }}
                  disabled={isSubmitting || loadingProducts}
                  className="w-full sm:w-auto text-center"
                >
                  Place Booking
                </PrimaryButton>
              </div>
            </div>

            <aside className="bg-gray-50 dark:bg-accent-dark/70 rounded-2xl shadow-xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-accent dark:text-white mb-4">Order Summary</h2>

              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-4">
                <div>
                  <strong>Type:</strong> {state.bookingType === 'overnight' ? 'Overnight' : 'Day Use'}
                </div>
                <div>
                  <strong>{state.bookingType === 'overnight' ? 'Check-in' : 'Date'}:</strong>{' '}
                  {state.checkInDate ? new Date(state.checkInDate).toLocaleDateString() : '—'}
                </div>
                {state.bookingType === 'overnight' && (
                  <div>
                    <strong>Check-out:</strong> {state.checkOutDate ? new Date(state.checkOutDate).toLocaleDateString() : '—'}
                  </div>
                )}
                {state.bookingType === 'overnight' && (
                  <div>
                    <strong>Nights:</strong> {numNights}
                  </div>
                )}
                <div>
                  <strong>Guests:</strong> {state.adults} adults, {state.children} kids
                </div>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-slate-700">
                {loadingProducts ? (
                  <div className="py-4 text-sm text-gray-500">Loading summary...</div>
                ) : (
                  lineItems.map((li) => (
                    <div key={`${li.kind}-${li.id}`} className="py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-accent dark:text-white truncate">{li.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-300">Qty: {li.qty}</div>
                      </div>
                      <div className="text-sm font-bold text-primary">₱{li.subtotal.toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-300 font-semibold">Total</div>
                <div className="text-2xl font-bold text-primary">₱{totalAmount.toLocaleString()}</div>
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-300">
                Demo payment only. This will create a booking record and email confirmation (if Mailtrap is configured).
              </div>
            </aside>
          </div>
        </div>
      </section>

      <Footer />

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 animate-slideUp">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-accent dark:text-white mb-2">
                Confirm Your Booking
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Are you sure you want to place this booking?
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Total Amount:</span>
                <span className="font-bold text-primary">₱{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Payment:</span>
                <span className="font-semibold text-accent dark:text-white capitalize">
                  {state.paymentMethod === 'cash' ? 'Cash on Arrival' : state.paymentMethod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Guest:</span>
                <span className="font-semibold text-accent dark:text-white">
                  {state.guestInfo?.firstName} {state.guestInfo?.lastName}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <PrimaryButton
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="flex-1 text-center"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Confirm Booking'
                )}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {bookingSuccess && (
        <div className="fixed inset-0 bg-gradient-to-br from-primary/90 to-secondary/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="text-center animate-bounceIn">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <svg
                className="w-12 h-12 text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-white mb-3">Booking Confirmed!</h2>
            <p className="text-xl text-white/90 mb-2">Your reservation has been placed successfully.</p>
            <p className="text-white/75">Redirecting to confirmation page...</p>
          </div>
        </div>
      )}
    </>
  );
}
