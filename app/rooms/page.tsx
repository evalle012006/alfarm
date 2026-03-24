'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import Lightbox from '@/components/ui/Lightbox';

// Static gallery images for products that have multi-image folders on disk.
// Keys are matched against the lowercase product name from the DB.
const GALLERY_MAP: Record<string, string[]> = {
  'blue room (ac)': [
    '/images/accommodation/blue_room/blue_room_6.jpeg',
    '/images/accommodation/blue_room/blue_room_2.jpeg',
    '/images/accommodation/blue_room/blue_room_3.jpeg',
    '/images/accommodation/blue_room/blue_room_4.jpeg',
    '/images/accommodation/blue_room/blue_room_5.jpeg',
    '/images/accommodation/blue_room/blue_room_1.jpeg',
  ],
  'dorm style cottage (small)': [
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_6.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_2.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_3.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_4.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_5.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_1.jpeg',
  ],
  'dorm style cottage (large)': [
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_6.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_2.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_3.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_4.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_5.jpeg',
    '/images/accommodation/dorm_style_cottage/dorm_style_cottage_1.jpeg',
  ],
  'orange terrace': [
    '/images/accommodation/orange_terrace/orange_terrace_1.jpeg',
    '/images/accommodation/orange_terrace/orange_terrace_2.jpeg',
    '/images/accommodation/orange_terrace/orange_terrace_3.jpeg',
    '/images/accommodation/orange_terrace/orange_terrace_4.jpeg',
    '/images/accommodation/orange_terrace/orange_terrace_5.jpeg',
  ],
  'native style cottage': [
    '/images/accommodation/native_style_room/native_style_room_1.jpeg',
    '/images/accommodation/native_style_room/native_style_room_2.jpeg',
    '/images/accommodation/native_style_room/native_style_room_3.jpeg',
    '/images/accommodation/native_style_room/native_style_room_4.jpeg',
    '/images/accommodation/native_style_room/native_style_room_5.jpeg',
  ],
  'mini rest house': [
    '/images/accommodation/mini_resthouse/mini_resthouse_1.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_2.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_3.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_4.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_5.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_6.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_7.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_8.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_9.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_10.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_11.jpeg',
    '/images/accommodation/mini_resthouse/mini_resthouse_12.jpeg',
  ],
  'function hall': [
    '/images/accommodation/function_hall/function_hall_1.jpeg',
    '/images/accommodation/function_hall/function_hall_2.jpeg',
    '/images/accommodation/function_hall/function_hall_3.jpeg',
    '/images/accommodation/function_hall/function_hall_4.jpeg',
    '/images/accommodation/function_hall/function_hall_5.jpeg',
  ],
  'screen cottage (small)': [
    '/images/accommodation/screen_cottages/screen_cottages_1.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_2.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_3.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_4.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_5.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_6.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_7.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_8.jpeg',
  ],
  'screen cottage (large)': [
    '/images/accommodation/screen_cottages/screen_cottages_1.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_2.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_3.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_4.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_5.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_6.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_7.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_8.jpeg',
  ],
  'poolside table': [
    '/images/accommodation/tables/table_2.jpeg',
    '/images/accommodation/tables/table_1.jpeg',
    '/images/accommodation/tables/table_3.jpeg',
    '/images/accommodation/tables/table_4.jpeg',
    '/images/accommodation/tables/table_5.jpeg',
  ],
  'open kubo': [
    '/images/accommodation/tables/table_2.jpeg',
    '/images/accommodation/tables/table_1.jpeg',
    '/images/accommodation/tables/table_3.jpeg',
  ],
  'mating cottage': [
    '/images/accommodation/screen_cottages/screen_cottages_1.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_2.jpeg',
    '/images/accommodation/screen_cottages/screen_cottages_3.jpeg',
  ],
  'yellow terrace standard': [
    '/images/accommodation/yellow_terrace/yellow_terrace_2.jpeg',
    '/images/accommodation/yellow_terrace/yellow_terrace_1.jpeg',
    '/images/accommodation/yellow_terrace/yellow_terrace_3.jpeg',
    '/images/accommodation/yellow_terrace/yellow_terrace_4.jpeg',
    '/images/accommodation/yellow_terrace/yellow_terrace_5.jpeg',
  ],
  'yellow terrace deluxe': [
    '/images/accommodation/yellow_terrace_1/yellow_terrace_55.jpeg',
    '/images/accommodation/yellow_terrace_1/yellow_terrace_22.jpeg',
    '/images/accommodation/yellow_terrace_1/yellow_terrace_33.jpeg',
    '/images/accommodation/yellow_terrace_1/yellow_terrace_44.jpeg',
    '/images/accommodation/yellow_terrace_1/yellow_terrace_11.jpeg',
    '/images/accommodation/yellow_terrace_1/yellow_terrace_66.jpeg',
  ],
  'rest house': [
    '/images/accommodation/rest_house/rest_house_12.jpeg',
    '/images/accommodation/rest_house/rest_house_2.jpeg',
    '/images/accommodation/rest_house/rest_house_3.jpeg',
    '/images/accommodation/rest_house/rest_house_4.jpeg',
    '/images/accommodation/rest_house/rest_house_5.jpeg',
    '/images/accommodation/rest_house/rest_house_6.jpeg',
    '/images/accommodation/rest_house/rest_house_7.jpeg',
    '/images/accommodation/rest_house/rest_house_8.jpeg',
    '/images/accommodation/rest_house/rest_house_9.jpeg',
    '/images/accommodation/rest_house/rest_house_10.jpeg',
    '/images/accommodation/rest_house/rest_house_11.jpeg',
    '/images/accommodation/rest_house/rest_house_1.jpeg',
    '/images/accommodation/rest_house/rest_house_13.jpeg',
    '/images/accommodation/rest_house/rest_house_14.jpeg',
  ],
  'duplex room (fan)': [
    '/images/accommodation/blue_room/blue_room_6.jpeg',
    '/images/accommodation/blue_room/blue_room_2.jpeg',
    '/images/accommodation/blue_room/blue_room_3.jpeg',
  ],
  'duplex room (ac)': [
    '/images/accommodation/blue_room/blue_room_6.jpeg',
    '/images/accommodation/blue_room/blue_room_2.jpeg',
    '/images/accommodation/blue_room/blue_room_3.jpeg',
  ],
};

// Resort common area images (pools, grounds) — shown in a separate highlight section
const RESORT_GALLERY = [
  '/images/accommodation/pools/pool_1.jpeg',
  '/images/accommodation/pools/pool_2.jpeg',
  '/images/accommodation/rest_house/rest_house_12.jpeg',
  '/images/accommodation/rest_house/rest_house_2.jpeg',
  '/images/accommodation/rest_house/rest_house_3.jpeg',
  '/images/accommodation/rest_house/rest_house_4.jpeg',
  '/images/accommodation/rest_house/rest_house_5.jpeg',
  '/images/accommodation/rest_house/rest_house_6.jpeg',
  '/images/accommodation/rest_house/rest_house_7.jpeg',
  '/images/accommodation/rest_house/rest_house_8.jpeg',
  '/images/accommodation/rest_house/rest_house_9.jpeg',
  '/images/accommodation/rest_house/rest_house_10.jpeg',
  '/images/accommodation/rest_house/rest_house_11.jpeg',
  '/images/accommodation/rest_house/rest_house_1.jpeg',
  '/images/accommodation/rest_house/rest_house_13.jpeg',
  '/images/accommodation/rest_house/rest_house_14.jpeg',
  '/images/accommodation/yellow_terrace/yellow_terrace_2.jpeg',
  '/images/accommodation/yellow_terrace/yellow_terrace_1.jpeg',
  '/images/accommodation/yellow_terrace/yellow_terrace_3.jpeg',
  '/images/accommodation/yellow_terrace/yellow_terrace_4.jpeg',
  '/images/accommodation/yellow_terrace/yellow_terrace_5.jpeg',
  '/images/accommodation/yellow_terrace_1/yellow_terrace_55.jpeg',
  '/images/accommodation/yellow_terrace_1/yellow_terrace_22.jpeg',
  '/images/accommodation/yellow_terrace_1/yellow_terrace_33.jpeg',
  '/images/accommodation/yellow_terrace_1/yellow_terrace_44.jpeg',
  '/images/accommodation/yellow_terrace_1/yellow_terrace_11.jpeg',
  '/images/accommodation/yellow_terrace_1/yellow_terrace_66.jpeg',
];

interface Product {
  id: number;
  title: string;
  pricePerNight: number;
  capacity: string[];
  description: string;
  type: string;
  category: string;
  time_slot: string;
  pricing_unit: string;
  imageUrl?: string;
}

function getGalleryImages(product: Product): string[] {
  const key = product.title.toLowerCase();
  if (GALLERY_MAP[key]) return GALLERY_MAP[key];
  // Fallback: use the single image_url from DB if available
  if (product.imageUrl) return [product.imageUrl];
  return [];
}

function getBookNowHref(product: Product): string {
  // Use the product's time_slot to determine the correct booking type
  const bookingType = product.time_slot === 'night' ? 'overnight' : 'day';
  return `/?type=${bookingType}`;
}

function getPricingLabel(product: Product): string {
  switch (product.pricing_unit) {
    case 'per_night': return '/ night';
    case 'per_head': return '/ person';
    case 'per_hour': return '/ hour';
    default: return product.time_slot === 'day' ? '/ day' : '/ night';
  }
}

export default function Rooms() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'day' | 'night'>('all');

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentGallery, setCurrentGallery] = useState<{ name: string, images: string[] }>({ name: '', images: [] });
  const [photoIndex, setPhotoIndex] = useState(0);

  const openGallery = (name: string, images: string[], startIndex: number = 0) => {
    if (images.length === 0) return;
    setCurrentGallery({ name, images });
    setPhotoIndex(startIndex);
    setLightboxOpen(true);
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Failed to load accommodations');
        const data: Product[] = await response.json();
        setProducts(data);
      } catch (err) {
        console.error(err);
        setError('Unable to load accommodations. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // Filter to only Accommodation category, exclude Entrance Fees, Rentals, Amenities
  const accommodations = products.filter(p => {
    if (p.category.includes('Entrance')) return false;
    if (p.category.includes('Rental')) return false;
    if (p.category.includes('Ameniti')) return false;
    if (filter === 'day' && p.time_slot === 'night') return false;
    if (filter === 'night' && p.time_slot === 'day') return false;
    return true;
  });

  const dayItems = accommodations.filter(p => p.time_slot === 'day' || p.time_slot === 'any');
  const nightItems = accommodations.filter(p => p.time_slot === 'night' || p.time_slot === 'any');

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fadeIn">
            <h1 className="section-title">Our Accommodations</h1>
            <p className="section-subtitle">Find your perfect home away from home</p>
          </div>
        </div>
      </section>

      {/* Filter + Grid */}
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            <span className="mr-2 text-sm font-medium text-gray-600 dark:text-gray-400">Show:</span>
            {(['all', 'day', 'night'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 text-sm rounded-xl border-2 transition-all duration-200 ${
                  filter === f
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/30'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:border-primary/50'
                }`}
              >
                {f === 'all' ? 'All' : f === 'day' ? 'Day-Use' : 'Overnight'}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-white">Loading accommodations...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-4 text-sm underline text-red-600 dark:text-red-400">
                Try Again
              </button>
            </div>
          )}

          {/* Products Grid */}
          {!loading && !error && (
            <>
              {accommodations.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400 text-lg">No accommodations found for this filter.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                  {accommodations.map((product, index) => {
                    const gallery = getGalleryImages(product);
                    const heroImage = gallery[0] || product.imageUrl || '/images/placeholder.jpeg';
                    const maxCapacity = product.capacity.length > 0 ? product.capacity[0] : null;

                    return (
                      <div
                        key={product.id}
                        className="card overflow-hidden group"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        {/* Product Image */}
                        <div
                          className="relative h-64 w-full overflow-hidden cursor-pointer"
                          onClick={() => openGallery(product.title, gallery, 0)}
                        >
                          <Image
                            src={heroImage}
                            alt={product.title}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            priority={index < 3}
                            quality={75}
                          />
                          <div className="absolute top-4 left-4 z-10">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                              product.time_slot === 'night'
                                ? 'bg-indigo-600 text-white'
                                : product.time_slot === 'day'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-teal-500 text-white'
                            }`}>
                              {product.time_slot === 'night' ? 'Overnight' : product.time_slot === 'day' ? 'Day-Use' : 'Any'}
                            </span>
                          </div>
                          <div className="absolute top-4 right-4 bg-primary text-white px-4 py-1 rounded-full font-bold z-10">
                            ₱{product.pricePerNight.toLocaleString()}
                          </div>
                          {/* Gallery Overlay Hint */}
                          {gallery.length > 0 && (
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="bg-white/90 text-primary px-4 py-2 rounded-lg font-bold flex items-center space-x-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>View {gallery.length} Photos</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="p-6">
                          <div className="mb-4">
                            <h3 className="text-xl font-bold text-accent dark:text-white">{product.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              {maxCapacity && (
                                <p className="text-sm text-gray-600 dark:text-white/80">{maxCapacity}</p>
                              )}
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {getPricingLabel(product)}
                              </span>
                            </div>
                          </div>

                          <p className="text-gray-700 mb-6 dark:text-white line-clamp-2 h-12 text-sm">
                            {product.description}
                          </p>

                          <div className="grid grid-cols-2 gap-3">
                            {gallery.length > 0 && (
                              <button
                                onClick={() => openGallery(product.title, gallery, 0)}
                                className="btn-outline py-2.5 text-xs flex items-center justify-center space-x-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Gallery</span>
                              </button>
                            )}
                            <Link
                              href={getBookNowHref(product)}
                              className={`btn-primary py-2.5 text-xs text-center ${gallery.length === 0 ? 'col-span-2' : ''}`}
                            >
                              Book Now
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Lightbox component */}
      <Lightbox
        isOpen={lightboxOpen}
        images={currentGallery.images}
        currentIndex={photoIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentGallery.images.length - 1))}
        onNext={() => setPhotoIndex((prev) => (prev < currentGallery.images.length - 1 ? prev + 1 : 0))}
        title={currentGallery.name}
      />

      {/* Amenities Section */}
      <section className="py-16 bg-gray-50 dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-accent mb-4 dark:text-white">Resort Amenities</h2>
            <p className="text-gray-600 dark:text-white">Standard amenities across all accommodations</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
              <div className="text-4xl mb-3">📶</div>
              <h4 className="font-semibold text-accent dark:text-white">High-Speed WiFi</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
              <div className="text-4xl mb-3">❄️</div>
              <h4 className="font-semibold text-accent dark:text-white">Climate Control</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
              <div className="text-4xl mb-3">🧴</div>
              <h4 className="font-semibold text-accent dark:text-white">Toiletries</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
              <div className="text-4xl mb-3">🧹</div>
              <h4 className="font-semibold text-accent dark:text-white">Daily Housekeeping</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
              <div className="text-4xl mb-3">🍽️</div>
              <h4 className="font-semibold text-accent dark:text-white">Room Service</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
              <div className="text-4xl mb-3">🔒</div>
              <h4 className="font-semibold text-accent dark:text-white">In-Room Safe</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
              <div className="text-4xl mb-3">☕</div>
              <h4 className="font-semibold text-accent dark:text-white">Coffee/Tea</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
              <div className="text-4xl mb-3">🌳</div>
              <h4 className="font-semibold text-accent dark:text-white">Nature Views</h4>
            </div>
          </div>
        </div>
      </section>

      {/* Policies Section */}
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-accent mb-8 text-center dark:text-white">Booking Information</h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-3">⏰</div>
                <h3 className="font-bold text-accent mb-2 dark:text-white">Check-In/Out</h3>
                <p className="text-gray-600 dark:text-white">Check-in: 2:00 PM</p>
                <p className="text-gray-600 dark:text-white">Check-out: 12:00 PM</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">❌</div>
                <h3 className="font-bold text-accent mb-2 dark:text-white">Cancellation</h3>
                <p className="text-gray-600 dark:text-white">Free cancellation up to 48 hours before arrival</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🐕</div>
                <h3 className="font-bold text-accent mb-2 dark:text-white">Pets</h3>
                <p className="text-gray-600 dark:text-white">Pet-friendly rooms available upon request</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 nature-gradient">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Book Your Stay?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Choose your perfect accommodation and start your adventure today
          </p>
          <Link href="/" className="bg-white text-primary hover:bg-gray-100 font-bold text-lg px-10 py-4 rounded-lg inline-block transition-all duration-300">
            Book Now
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
