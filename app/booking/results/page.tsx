'use client';

import { useEffect, useState } from 'react';
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

export default function BookingResultsPage() {
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
      <section className="relative py-16 hero-gradient overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-60 mix-blend-screen">
          <div className="mx-auto h-full max-w-4xl bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.4),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(96,165,250,0.25),_transparent_55%)]" />
        </div>
        <div className="relative container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300/80">
              Step 2 of 5 · Select your stay
            </p>
            <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-accent md:text-5xl dark:text-white">
              Availability Results
            </h1>
            <div className="max-w-2xl mx-auto mb-6">
              <BookingStepper current="select" />
            </div>
            <p className="mb-5 text-sm text-slate-700 md:text-base dark:text-slate-200/80">
              {checkInDate ? (
                searchType === 'overnight' && checkOutDate 
                  ? `${new Date(checkInDate).toLocaleDateString()} - ${new Date(checkOutDate).toLocaleDateString()} (${numNights} night${numNights > 1 ? 's' : ''})`
                  : `Showing options for ${new Date(checkInDate).toLocaleDateString()}`
              ) : 'Select your preferred accommodations and see what is available in real time.'}
            </p>
            <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/90 px-5 py-2 text-xs font-medium text-slate-800 shadow-lg backdrop-blur-md dark:border-white/20 dark:bg-white/10 dark:text-slate-50 md:text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-slate-800 border border-slate-200 dark:border-transparent dark:bg-slate-900/40 dark:text-slate-100">
                <span className="text-lg">📅</span>
                {checkInDate || 'No date selected'}
                {searchType === 'overnight' && checkOutDate ? ` → ${checkOutDate}` : ''}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-slate-800 border border-slate-200 dark:border-transparent dark:bg-slate-900/40 dark:text-slate-100">
                <span className="text-lg">👥</span>
                {searchAdults} Adults, {searchChildren} Kids
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-slate-800 border border-slate-200 capitalize dark:border-transparent dark:bg-slate-900/40 dark:text-slate-100">
                <span className="text-lg">🌙</span>
                {searchType === 'day' ? 'Day-use' : 'Overnight'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters + Results */}
      <section className="py-12 bg-slate-50 pb-32 dark:bg-slate-950/95">
        <div className="container mx-auto max-w-6xl px-4">
          {/* Filter Bar */}
          <div className="mb-10 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800/80 dark:bg-slate-900/80 dark:shadow-[0_18px_45px_rgba(15,23,42,0.85)] md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80 dark:text-sky-300/80">
                  Available Options
                </p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {loading ? 'Checking availability…' : `${filteredProducts.length} stays found`}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Adjust filters to find the perfect spot for your group.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 hidden text-xs font-medium text-slate-500 dark:text-slate-400 md:inline">
                  Filter by
                </span>
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-1.5 text-xs md:text-sm rounded-full border transition-colors ${
                    filter === 'all'
                      ? 'border-transparent bg-primary text-white shadow-sm'
                      : 'border-slate-200/70 bg-white/40 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800/80'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('room')}
                  className={`px-4 py-1.5 text-xs md:text-sm rounded-full border transition-colors ${
                    filter === 'room'
                      ? 'border-transparent bg-primary text-white shadow-sm'
                      : 'border-slate-200/70 bg-white/40 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800/80'
                  }`}
                >
                  Rooms
                </button>
                <button
                  onClick={() => setFilter('day-use')}
                  className={`px-4 py-1.5 text-xs md:text-sm rounded-full border transition-colors ${
                    filter === 'day-use'
                      ? 'border-transparent bg-primary text-white shadow-sm'
                      : 'border-slate-200/70 bg-white/40 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800/80'
                  }`}
                >
                  Cottages & Day Use
                </button>
                <button
                  onClick={() => setFilter('add-on')}
                  className={`px-4 py-1.5 text-xs md:text-sm rounded-full border transition-colors ${
                    filter === 'add-on'
                      ? 'border-transparent bg-primary text-white shadow-sm'
                      : 'border-slate-200/70 bg-white/40 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800/80'
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => {
                const quantity = cart[product.id] || 0;
                const remaining = availabilityMap[product.id]?.remaining;
                const isAvailable = availabilityMap[product.id]?.is_available ?? true;
                
                return (
                  <article
                    key={product.id}
                    className={`card flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-[0_20px_45px_rgba(15,23,42,0.85)] ${
                      quantity > 0
                        ? 'ring-2 ring-primary shadow-lg dark:ring-sky-400'
                        : 'hover:-translate-y-1 hover:shadow-lg dark:hover:shadow-[0_28px_70px_rgba(15,23,42,0.9)]'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:border-sky-400/40 dark:bg-sky-500/15 dark:text-sky-200">
                          {product.category}
                        </span>
                        <div className="flex items-center gap-2">
                          {typeof remaining === 'number' && (
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                                isAvailable
                                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-200'
                                  : 'border-red-500/50 bg-red-500/10 text-red-600 dark:border-red-400/50 dark:bg-red-500/15 dark:text-red-200'
                              }`}
                            >
                              {isAvailable ? `${remaining} left` : 'Sold out'}
                            </span>
                          )}
                          {quantity > 0 && (
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/90 text-xs font-bold text-white shadow-md ring-2 ring-primary/30">
                              {quantity}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <h3 className="mb-2 text-xl font-semibold text-accent dark:text-white">
                        {product.title}
                      </h3>

                      <p className="mb-4 text-2xl font-semibold text-slate-900 dark:text-slate-50">
                        ₱{product.pricePerNight.toLocaleString()}
                        <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary-700 dark:bg-primary/20 dark:text-primary-200">
                          / {product.type === 'day-use' ? 'day' : 'night'}
                        </span>
                        {product.type === 'room' && searchType === 'overnight' && numNights > 1 && (
                          <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">
                            ₱{(product.pricePerNight * numNights).toLocaleString()} total for {numNights} nights
                          </span>
                        )}
                      </p>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {product.capacity.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-[10px] rounded bg-primary/5 text-primary-700 dark:bg-primary/20 dark:text-primary-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                        {product.description}
                      </p>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800">
                      {quantity === 0 ? (
                        <button
                          onClick={() => updateCart(product.id, 1)}
                          disabled={typeof remaining === 'number' ? remaining <= 0 : false}
                          className="btn-outline w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {typeof remaining === 'number' && remaining <= 0 ? 'Not Available' : 'Add to Booking'}
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-800 rounded-lg p-1">
                          <button
                            onClick={() => updateCart(product.id, -1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors"
                          >
                            -
                          </button>
                          <span className="font-bold text-accent dark:text-white">{quantity}</span>
                          <button
                            onClick={() => updateCart(product.id, 1)}
                            disabled={typeof remaining === 'number' ? quantity >= remaining : false}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md animate-slideUp dark:border-slate-800/80 dark:bg-slate-950/95 dark:shadow-[0_-18px_60px_rgba(15,23,42,0.9)]">
          <div className="container mx-auto flex max-w-6xl flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Total Estimate
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2 text-slate-900 dark:text-slate-100">
                <span className="text-2xl font-bold text-primary dark:text-primary-300">
                  ₱{totalCost.toLocaleString()}
                </span>
                <span className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
                  {totalItems > 0 ? `for ${totalItems} item${totalItems !== 1 ? 's' : ''}` : ''}{' '}
                  <span className="ml-1 text-[11px] text-slate-500 dark:text-slate-400">
                    (incl. ₱{totalEntranceFees} entrance fees)
                  </span>
                </span>
              </div>
            </div>
            <PrimaryButton
              onClick={handleProceed}
              className="w-full justify-center px-8 py-3 text-sm font-semibold shadow-lg shadow-primary/40 md:w-auto"
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


