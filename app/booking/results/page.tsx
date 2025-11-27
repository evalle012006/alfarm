'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PrimaryButton from '@/components/ui/PrimaryButton';
import CountSelector from '@/components/ui/CountSelector';
import Notification, { NotificationType } from '@/components/ui/Notification';

interface ProductOption {
  id: number;
  title: string;
  pricePerNight: number;
  capacity: string[];
  description: string;
  type: string;
  category: string;
}

export default function BookingResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const searchType = searchParams.get('type') || 'day-use';
  const searchDate = searchParams.get('date') || '';
  const searchAdults = parseInt(searchParams.get('adults') || '2');
  const searchChildren = parseInt(searchParams.get('children') || '0');

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [cart, setCart] = useState<{ [key: number]: number }>({});
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: NotificationType;
  }>({ show: false, message: '', type: 'error' });

  useEffect(() => {
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

    fetchProducts();
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
    // If searching for overnight, hide strict day-use items (unless they are flexible)
    if (searchType === 'overnight' && product.category.includes('Entrance')) return false; 
    // Note: Logic can be refined. For now, we trust the user to pick valid items or use 'all' to see everything.
    
    return true;
  });

  const updateCart = (productId: number, delta: number) => {
    setCart(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      const newCart = { ...prev, [productId]: next };
      if (next === 0) delete newCart[productId];
      return newCart;
    });
  };

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  
  // Calculate Entrance Fees
  const FEES = {
    DAY: { ADULT: 60, CHILD: 30 },
    NIGHT: { ADULT: 70, CHILD: 35 }
  };
  const currentFees = searchType === 'day-use' ? FEES.DAY : FEES.NIGHT;
  const totalEntranceFees = (searchAdults * currentFees.ADULT) + (searchChildren * currentFees.CHILD);

  // Total Cost = Product Costs + Entrance Fees
  const productCost = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = products.find(p => p.id === parseInt(id));
    return sum + (product ? product.pricePerNight * qty : 0);
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

    // In a real app, we'd pass the cart to the next step via context, state, or query params
    // For now, we just navigate to the info page with a generic param
    const cartParams = new URLSearchParams();
    Object.entries(cart).forEach(([id, qty]) => {
      cartParams.append(`item_${id}`, qty.toString());
    });
    // Pass forward search params too
    cartParams.append('date', searchDate);
    cartParams.append('adults', searchAdults.toString());
    cartParams.append('children', searchChildren.toString());

    router.push(`/booking/info?${cartParams.toString()}`);
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
      <section className="py-16 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <h1 className="section-title mb-3">Availability Results</h1>
            <p className="section-subtitle mb-4">
              {searchDate ? `Showing options for ${new Date(searchDate).toLocaleDateString()}` : 'Select your preferred accommodations'}
            </p>
            <div className="inline-flex items-center gap-4 bg-white/20 backdrop-blur-md px-6 py-2 rounded-full text-sm text-gray-800 dark:text-white border border-white/30">
              <span>📅 {searchDate || 'No date selected'}</span>
              <span>👥 {searchAdults} Adults, {searchChildren} Kids</span>
              <span className="capitalize">🌙 {searchType}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters + Results */}
      <section className="py-12 bg-white dark:bg-slate-950 pb-32">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm font-semibold text-primary tracking-wide uppercase mb-1">
                Available Options
              </p>
              <h2 className="text-2xl font-bold text-accent dark:text-white mb-1">
                {loading ? 'Checking...' : `${filteredProducts.length} stays found`}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                  filter === 'all' 
                  ? 'bg-accent text-white border-accent' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('room')}
                className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                  filter === 'room' 
                  ? 'bg-accent text-white border-accent' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800'
                }`}
              >
                Rooms
              </button>
              <button
                onClick={() => setFilter('day-use')}
                className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                  filter === 'day-use' 
                  ? 'bg-accent text-white border-accent' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800'
                }`}
              >
                Cottages & Day Use
              </button>
              <button
                onClick={() => setFilter('add-on')}
                className={`px-4 py-2 text-sm rounded-full border transition-colors ${
                  filter === 'add-on' 
                  ? 'bg-accent text-white border-accent' 
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800'
                }`}
              >
                Add-ons
              </button>
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => {
                const quantity = cart[product.id] || 0;
                
                return (
                  <article key={product.id} className={`card flex flex-col h-full transition-all duration-300 ${quantity > 0 ? 'ring-2 ring-primary shadow-lg' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <span className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300">
                          {product.category}
                        </span>
                        {quantity > 0 && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                            {quantity}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-xl font-bold text-accent dark:text-white mb-2">
                        {product.title}
                      </h3>

                      <p className="text-2xl font-bold text-primary mb-3">
                        ₱{product.pricePerNight.toLocaleString()} 
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 uppercase">
                          / {product.type === 'day-use' ? 'day' : 'night'}
                        </span>
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
                          className="btn-outline w-full py-2 text-sm"
                        >
                          Add to Booking
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
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-green-500 transition-colors"
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-4 z-40 animate-slideUp dark:bg-slate-900 dark:border-slate-800">
          <div className="container mx-auto max-w-6xl flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide dark:text-gray-400">Total Estimate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-primary">₱{totalCost.toLocaleString()}</span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {totalItems > 0 ? `for ${totalItems} item${totalItems !== 1 ? 's' : ''}` : ''} 
                  <span className="text-xs text-gray-400 ml-1">(incl. ₱{totalEntranceFees} entrance fees)</span>
                </span>
              </div>
            </div>
            <PrimaryButton 
              onClick={handleProceed}
              className="px-8 py-3 shadow-lg hover:shadow-primary/40"
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


