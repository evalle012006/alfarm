'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PrimaryButton from '@/components/ui/PrimaryButton';
import Notification, { NotificationType } from '@/components/ui/Notification';
import BookingStepper from '@/components/BookingStepper';
import { useBooking } from '@/lib/BookingContext';

interface ProductOption {
  id: number;
  title: string;
  pricePerNight: number;
  capacity: string[];
  description: string;
  type: string;
  category: string;
}

interface AvailabilityItem {
  id: number;
  remaining: number;
  is_available: boolean;
}

function BookingResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state: bookingState, setSearch, incrementCart, setCartQuantity } = useBooking();

  const searchType = (searchParams.get('type') || bookingState.bookingType || 'day') as 'day' | 'overnight';
  const checkInDate = searchParams.get('check_in') || searchParams.get('date') || bookingState.checkInDate || '';
  const checkOutDate = searchParams.get('check_out') || bookingState.checkOutDate || '';
  const searchAdults = parseInt(searchParams.get('adults') || bookingState.adults.toString() || '2');
  const searchChildren = parseInt(searchParams.get('children') || bookingState.children.toString() || '0');

  // Calculate number of nights for overnight stays
  const numNights = searchType === 'overnight' && checkInDate && checkOutDate
    ? Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))
    : 1;

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const cart = bookingState.cart;
  const [availabilityMap, setAvailabilityMap] = useState<Record<number, AvailabilityItem>>({});
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: NotificationType;
  }>({ show: false, message: '', type: 'error' });

  useEffect(() => {
    if (!checkInDate) {
      router.push('/');
      return;
    }

    setSearch({
      bookingType: searchType,
      checkInDate,
      checkOutDate: searchType === 'overnight' ? checkOutDate : undefined,
      adults: searchAdults,
      children: searchChildren,
    });

    async function fetchProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data);
      } catch (err) {
        console.error(err);
        setError('Unable to load availability at this time.');
      } finally {
        setLoading(false);
      }
    }

    async function fetchAvailability() {
      try {
        const params = new URLSearchParams({
          type: searchType,
          check_in: checkInDate,
        });
        if (searchType === 'overnight') {
          params.append('check_out', checkOutDate);
          params.append('time_slot', 'night');
        } else {
          params.append('time_slot', 'day');
        }

        const response = await fetch(`/api/availability?${params.toString()}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || 'Failed to check availability');
        }
        const data = await response.json();
        const nextMap: Record<number, AvailabilityItem> = {};
        (data.availability || []).forEach((item: AvailabilityItem) => {
          nextMap[item.id] = item;
        });
        setAvailabilityMap(nextMap);
      } catch (err) {
        console.error(err);
        setNotification({
          show: true,
          message: err instanceof Error ? err.message : 'Failed to check availability',
          type: 'warning',
        });
      }
    }

    fetchProducts();
    fetchAvailability();
  }, []);

  // Filter products based on booking type and excluding entrance fees
  const filteredProducts = products.filter(product => {
    // 1. Hide Entrance Fees from main list (they are implicit or separate)
    if (product.category.includes('Entrance')) return false;

    // 2. Filter by internal UI filter state
    if (filter !== 'all') {
      if (filter === 'room' && product.type !== 'room') return false;
      if (filter === 'day-use' && product.type !== 'day-use') return false;
      if (filter === 'add-on' && product.type !== 'add-on') return false;
    }

    // 3. Filter by initial search type (Day-use vs Overnight)
    // For overnight: prioritize per_night items, hide day-only items
    // For day-use: prioritize day items, hide night-only items

    return true;
  });

  const updateCart = (productId: number, delta: number) => {
    const remaining = availabilityMap[productId]?.remaining;
    const current = cart[productId] || 0;
    const next = Math.max(0, current + delta);

    if (typeof remaining === 'number' && next > remaining) {
      setNotification({
        show: true,
        message: `Only ${remaining} left for this item on your selected date(s).`,
        type: 'warning',
      });
      setCartQuantity(productId, remaining);
      return;
    }

    incrementCart(productId, delta);
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);

  // Calculate Entrance Fees
  const FEES = {
    DAY: { ADULT: 60, CHILD: 30 },
    NIGHT: { ADULT: 70, CHILD: 35 }
  };
  const currentFees = searchType === 'day' ? FEES.DAY : FEES.NIGHT;
  const totalEntranceFees = (searchAdults * currentFees.ADULT) + (searchChildren * currentFees.CHILD);

  // Total Cost = Product Costs + Entrance Fees
  // For overnight stays, multiply per_night items by number of nights
  const productCost = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = products.find(p => p.id === parseInt(id));
    if (!product) return sum;

    // Check if this is a per_night item (rooms) for overnight bookings
    const isPerNight = product.type === 'room' && searchType === 'overnight';
    const multiplier = isPerNight ? numNights : 1;

    return sum + (product.pricePerNight * qty * multiplier);
  }, 0);

  const totalCost = productCost + totalEntranceFees;

  const handleProceed = () => {
    // Validation: Require at least one accommodation for overnight stays
    if (searchType === 'overnight' && totalItems === 0) {
      setNotification({
        show: true,
        message: 'For overnight stays, please select at least one room or accommodation.',
        type: 'warning'
      });
      return;
    }

    router.push('/booking/info');
  };

  return (
    <>
      <Navigation />

      <Notification
        isVisible={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
      />

      {/* Hero / Summary */}
      <section className="py-12 md:py-20 bg-gradient-to-br from-primary/5 via-white to-secondary/5 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <div className="inline-flex items-center gap-2 bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-full mb-4">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span className="text-sm font-semibold text-primary">Step 2 of 4</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-accent dark:text-white mb-4">
              Select Your Stay
            </h1>
            <div className="max-w-2xl mx-auto mb-6">
              <BookingStepper current="select" />
            </div>
            <p className="text-base text-gray-600 dark:text-gray-300 mb-6">
              {checkInDate ? (
                searchType === 'overnight' && checkOutDate
                  ? `${new Date(checkInDate).toLocaleDateString()} - ${new Date(checkOutDate).toLocaleDateString()} (${numNights} night${numNights > 1 ? 's' : ''})`
                  : `Showing options for ${new Date(checkInDate).toLocaleDateString()}`
              ) : 'Select your preferred accommodations and see what is available in real time.'}
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-3 rounded-2xl border border-gray-200 bg-white/90 px-4 sm:px-6 py-3 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 w-full sm:w-auto">
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-accent dark:text-white">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {checkInDate || 'No date selected'}
                {searchType === 'overnight' && checkOutDate ? ` → ${checkOutDate}` : ''}
              </span>
              <span className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-slate-700"></span>
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-accent dark:text-white">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {searchAdults} Adults, {searchChildren} Kids
              </span>
              <span className="hidden sm:block h-4 w-px bg-gray-300 dark:bg-slate-700"></span>
              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-accent dark:text-white capitalize">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                {searchType === 'day' ? 'Day-use' : 'Overnight'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters + Results */}
      <section className="py-8 md:py-16 bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900 pb-32">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Filter Bar */}
          <div className="mb-6 md:mb-10 rounded-2xl md:rounded-3xl border border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900 p-4 md:p-6 lg:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-accent dark:text-white">
                      {loading ? 'Checking availability…' : `${filteredProducts.length} Options Available`}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Choose your perfect accommodation
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                  Filter:
                </span>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 text-sm rounded-xl border-2 transition-all duration-200 ${filter === 'all'
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-primary/50'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('room')}
                  className={`px-4 py-2 text-sm rounded-xl border-2 transition-all duration-200 ${filter === 'room'
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-primary/50'
                    }`}
                >
                  Rooms
                </button>
                <button
                  onClick={() => setFilter('day-use')}
                  className={`px-4 py-2 text-sm rounded-xl border-2 transition-all duration-200 ${filter === 'day-use'
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-primary/50'
                    }`}
                >
                  Cottages & Day Use
                </button>
                <button
                  onClick={() => setFilter('add-on')}
                  className={`px-4 py-2 text-sm rounded-xl border-2 transition-all duration-200 ${filter === 'add-on'
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-primary/50'
                    }`}
                >
                  Add-ons
                </button>
              </div>
            </div>
          </div>

          {/* Loading / Error State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-white">Loading availability...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12 bg-red-50 rounded-lg">
              <p className="text-red-600 font-medium">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-4 text-sm underline">Try Again</button>
            </div>
          )}

          {/* Product Cards */}
          {!loading && !error && (
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const quantity = cart[product.id] || 0;
                const remaining = availabilityMap[product.id]?.remaining;
                const isAvailable = availabilityMap[product.id]?.is_available ?? true;

                return (
                  <article
                    key={product.id}
                    className={`flex h-full flex-col rounded-3xl border bg-white shadow-lg transition-all duration-300 dark:bg-slate-900 dark:border-slate-800 ${quantity > 0
                      ? 'ring-2 ring-primary shadow-xl scale-105 dark:ring-primary-400'
                      : 'border-gray-200 hover:-translate-y-2 hover:shadow-2xl'
                      }`}
                  >
                    <div className="flex-1 p-6">
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary dark:border-primary/30 dark:from-primary/20 dark:to-secondary/20">
                          {product.category}
                        </span>
                        <div className="flex items-center gap-2">
                          {typeof remaining === 'number' && (
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${isAvailable
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'border-red-500/30 bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300'
                                }`}
                            >
                              {isAvailable ? `${remaining} left` : 'Sold out'}
                            </span>
                          )}
                          {quantity > 0 && (
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-600 text-sm font-bold text-white shadow-lg">
                              {quantity}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="mb-3 text-lg font-bold text-accent dark:text-white">
                        {product.title}
                      </h3>

                      <div className="mb-4">
                        <p className="text-2xl font-bold text-accent dark:text-white">
                          ₱{product.pricePerNight.toLocaleString()}
                          <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                            / {product.type === 'day-use' ? 'day' : 'night'}
                          </span>
                        </p>
                        {product.type === 'room' && searchType === 'overnight' && numNights > 1 && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            ₱{(product.pricePerNight * numNights).toLocaleString()} for {numNights} nights
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.capacity.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {product.description}
                      </p>
                    </div>

                    <div className="p-6 pt-0">
                      {quantity === 0 ? (
                        <button
                          onClick={() => updateCart(product.id, 1)}
                          disabled={typeof remaining === 'number' ? remaining <= 0 : false}
                          className="w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-primary-600 text-white hover:shadow-lg hover:shadow-primary/30 hover:scale-105"
                        >
                          {typeof remaining === 'number' && remaining <= 0 ? 'Not Available' : 'Add to Booking'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-2 border-2 border-primary/20">
                          <button
                            onClick={() => updateCart(product.id, -1)}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-white hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all duration-200 font-bold text-lg shadow-sm"
                          >
                            −
                          </button>
                          <span className="font-bold text-xl text-accent dark:text-white">{quantity}</span>
                          <button
                            onClick={() => updateCart(product.id, 1)}
                            disabled={typeof remaining === 'number' ? quantity >= remaining : false}
                            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-900 text-gray-700 dark:text-white hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Sticky Summary Footer */}
      {(totalItems > 0 || totalEntranceFees > 0) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-primary/20 bg-gradient-to-r from-white via-gray-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-3 md:p-4 shadow-2xl backdrop-blur-md animate-slideUp">
          <div className="container mx-auto flex max-w-6xl flex-col items-stretch gap-3 md:gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="hidden md:flex w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-600 items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total Estimate
                </p>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    ₱{totalCost.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {totalItems > 0 ? `for ${totalItems} item${totalItems !== 1 ? 's' : ''}` : ''}
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      (incl. ₱{totalEntranceFees} entrance)
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <PrimaryButton
              onClick={handleProceed}
              className="w-full md:w-auto justify-center px-6 md:px-8 py-3 md:py-4 text-sm md:text-base font-semibold shadow-xl shadow-primary/40 hover:shadow-2xl hover:shadow-primary/50 hover:scale-105 transition-all duration-200"
            >
              Proceed to Booking →
            </PrimaryButton>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default function BookingResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <BookingResultsContent />
    </Suspense>
  );
}

