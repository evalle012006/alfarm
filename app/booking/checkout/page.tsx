'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Notification, { NotificationType } from '@/components/ui/Notification';
import BookingStepper from '@/components/BookingStepper';
import { getBookingCartItems, useBooking } from '@/lib/BookingContext';
import { useAuth } from '@/lib/AuthContext';

interface ProductOption {
  id: number;
  title: string;
  pricePerNight: number;
  capacity: string[];
  description: string;
  type: string;
  category: string;
  pricing_unit: string;
}

function BookingCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, setConfirmation, reset } = useBooking();
  const { token } = useAuth();

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [entranceFees, setEntranceFees] = useState<{
    day: { adult: { id: number; price: number } | null; child: { id: number; price: number } | null };
    night: { adult: { id: number; price: number } | null; child: { id: number; price: number } | null };
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
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

  // Show notification if returning from cancelled PayMongo checkout
  useEffect(() => {
    if (searchParams.get('cancelled') === 'true') {
      setNotification({
        show: true,
        message: 'Payment was cancelled. You can try again.',
        type: 'warning',
      });
    }
  }, [searchParams]);

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

    fetch('/api/products/entrance-fees')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setEntranceFees(data); })
      .catch(() => { });
  }, []);

  const fees = useMemo(() => {
    if (!entranceFees) return { adult: null, child: null };
    const slot = state.bookingType === 'overnight' ? entranceFees.night : entranceFees.day;
    return {
      adult: slot.adult ? { id: slot.adult.id, title: 'Adult Entrance Fee', pricePerNight: slot.adult.price } : null,
      child: slot.child ? { id: slot.child.id, title: 'Kid Entrance Fee', pricePerNight: slot.child.price } : null,
    };
  }, [entranceFees, state.bookingType]);

  const lineItems = useMemo(() => {
    const items: Array<{ id: number; title: string; qty: number; unit: number; subtotal: number; kind: 'cart' | 'fee' }> = [];

    for (const item of cartItems) {
      const p = products.find((x) => x.id === item.product_id);
      if (!p) continue;

      const isPerNight = p.pricing_unit === 'per_night' && state.bookingType === 'overnight';
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
  }, [cartItems, fees, numNights, products, state.adults, state.bookingType, state.children]);

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

      const basePayload = {
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

      // ── PayMongo flow: create booking + checkout session, then redirect ──
      const res = await fetch('/api/bookings/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(basePayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create checkout session');
      }

      // Redirect to PayMongo hosted checkout page
      // Note: we do NOT reset state here — if the user cancels on PayMongo,
      // they return to this page with their cart intact
      window.location.href = data.checkout_url;
      return; // Don't setIsSubmitting(false) — page is navigating away
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

      <section className="py-20 bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-full mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-primary">Final Step</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-accent dark:text-white mb-4">
              Complete Your Booking
            </h1>
            <div className="max-w-2xl mx-auto mb-6">
              <BookingStepper current="payment" />
            </div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Review your reservation details and confirm your payment method
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Payment Method Info */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 md:p-8 border border-gray-100 dark:border-slate-800 order-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-accent dark:text-white">Payment</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Secure online payment via PayMongo</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg shadow-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-accent dark:text-white mb-1">Pay Online</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Card &middot; GCash &middot; GrabPay &middot; Maya</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">You&apos;ll be redirected to a secure payment page after confirming.</div>
                    </div>
                    <div>
                      <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guest Details Section */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 md:p-8 border border-gray-100 dark:border-slate-800 order-3">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-secondary-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-accent dark:text-white">Guest Information</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your contact details</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl bg-gray-50  dark:bg-slate-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Name</div>
                    <div className="font-semibold text-accent dark:text-white">
                      {state.guestInfo?.firstName} {state.guestInfo?.lastName}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email Address</div>
                    <div className="font-semibold text-accent dark:text-white break-all">{state.guestInfo?.email}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800 md:col-span-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Phone Number</div>
                    <div className="font-semibold text-accent dark:text-white">{state.guestInfo?.phone}</div>
                  </div>
                </div>
              </div>

              {/* Terms & Actions Section */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 md:p-8 border border-gray-100 dark:border-slate-800 order-4">
                {/* Terms and Conditions */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-slate-800 dark:to-slate-800 border border-primary/20 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <label htmlFor="terms" className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                      I agree to the resort house rules and cancellation policy. I understand this is a demo booking system.
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/booking/info')}
                    className="px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-white font-semibold hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 w-full sm:w-auto text-center"
                  >
                    ← Back
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
                    className="w-full sm:flex-1 text-center"
                  >
                    Place Booking →
                  </PrimaryButton>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <aside className="lg:sticky lg:top-6 h-fit order-first lg:order-none">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 md:p-8 border border-gray-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-accent dark:text-white">Order Summary</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Review your booking</p>
                  </div>
                </div>

                {/* Booking Details */}
                <div className="space-y-3 mb-6 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-slate-800 dark:to-slate-800 border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <span>Type</span>
                    </div>
                    <div className="font-semibold text-accent dark:text-white">
                      {state.bookingType === 'overnight' ? 'Overnight' : 'Day Use'}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{state.bookingType === 'overnight' ? 'Check-in' : 'Date'}</span>
                    </div>
                    <div className="font-semibold text-accent dark:text-white">
                      {state.checkInDate ? new Date(state.checkInDate).toLocaleDateString() : '—'}
                    </div>
                  </div>
                  {state.bookingType === 'overnight' && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Check-out</span>
                        </div>
                        <div className="font-semibold text-accent dark:text-white">
                          {state.checkOutDate ? new Date(state.checkOutDate).toLocaleDateString() : '—'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                          </svg>
                          <span>Nights</span>
                        </div>
                        <div className="font-semibold text-primary">{numNights}</div>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>Guests</span>
                    </div>
                    <div className="font-semibold text-accent dark:text-white">
                      {state.adults} adults, {state.children} kids
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3 mb-6">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Items
                  </div>
                  {loadingProducts ? (
                    <div className="py-8 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-primary"></div>
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lineItems.map((li) => (
                        <div
                          key={`${li.kind}-${li.id}`}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm text-accent dark:text-white truncate">{li.title}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Qty: {li.qty}</div>
                          </div>
                          <div className="text-sm font-bold text-primary whitespace-nowrap">
                            ₱{li.subtotal.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="pt-6 border-t-2 border-gray-200 dark:border-slate-700">
                  <div className="flex items-end justify-between mb-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Amount</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        ₱{totalAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        Demo payment only. This will create a booking record and send an email confirmation if Mailtrap is configured.
                      </p>
                    </div>
                  </div>
                </div>
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
                  Pay Online (Card / GCash / GrabPay / Maya)
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

    </>
  );
}

export default function BookingCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <BookingCheckoutContent />
    </Suspense>
  );
}
