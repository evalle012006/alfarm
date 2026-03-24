'use client';

import { useBooking } from '@/lib/BookingContext';
import Lightbox from '@/components/ui/Lightbox';
import Image from 'next/image';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SectionHeader from '@/components/ui/SectionHeader';
import PrimaryButton from '@/components/ui/PrimaryButton';
import TagToggle from '@/components/ui/TagToggle';
import CountSelector from '@/components/ui/CountSelector';
import Notification, { NotificationType } from '@/components/ui/Notification';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { reset, setSearch } = useBooking();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
  const [bookingType, setBookingType] = useState('Day-use');
  const [checkInDate, setCheckInDate] = useState(today);
  const [checkOutDate, setCheckOutDate] = useState(tomorrow);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [showGuestMenu, setShowGuestMenu] = useState(false);
  const guestMenuRef = useRef<HTMLDivElement>(null);

  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: NotificationType;
  }>({ show: false, message: '', type: 'error' });

  // Modal state for feature cards
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  // Entrance fees fetched from DB
  const [entranceFees, setEntranceFees] = useState<{
    day: { adult: { id: number; price: number } | null; child: { id: number; price: number } | null };
    night: { adult: { id: number; price: number } | null; child: { id: number; price: number } | null };
  } | null>(null);

  useEffect(() => {
    fetch('/api/products/entrance-fees')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setEntranceFees(data); })
      .catch(() => { });
  }, []);

  // Calculate Entrance Fee Estimate
  const currentFees = entranceFees
    ? (bookingType === 'Day-use' ? entranceFees.day : entranceFees.night)
    : null;
  const adultFee = currentFees?.adult?.price ?? 0;
  const childFee = currentFees?.child?.price ?? 0;
  const estimatedEntranceFee = (adults * adultFee) + (children * childFee);

  // Close guest menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (guestMenuRef.current && !guestMenuRef.current.contains(event.target as Node)) {
        setShowGuestMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = () => {
    if (!checkInDate) {
      setNotification({
        show: true,
        message: 'Please select a date for your visit.',
        type: 'error'
      });
      return;
    }

    // For overnight, require check-out date
    if (bookingType === 'Overnight' && !checkOutDate) {
      setNotification({
        show: true,
        message: 'Please select a check-out date for overnight stays.',
        type: 'error'
      });
      return;
    }

    // Validate check-out is after check-in
    if (bookingType === 'Overnight' && checkOutDate && checkOutDate <= checkInDate) {
      setNotification({
        show: true,
        message: 'Check-out date must be after check-in date.',
        type: 'error'
      });
      return;
    }

    const normalizedType = bookingType === 'Day-use' ? 'day' : 'overnight';
    reset({ keepSearch: false });
    setSearch({
      bookingType: normalizedType,
      checkInDate,
      checkOutDate: normalizedType === 'overnight' ? checkOutDate : undefined,
      adults,
      children,
    });

    const params = new URLSearchParams({
      type: normalizedType,
      check_in: checkInDate,
      adults: adults.toString(),
      children: children.toString(),
    });

    if (bookingType === 'Overnight' && checkOutDate) {
      params.append('check_out', checkOutDate);
    }

    router.push(`/booking/results?${params.toString()}`);
  };

  const features = [
    {
      id: 'adventure',
      icon: '🏔️',
      title: 'Adventure Activities',
      description: 'Horseback riding, cave tours, and more thrilling adventures across our expansive park.',
      color: 'primary',
      images: [
        '/images/features/adventure/adventure-1.jpg',
        '/images/features/adventure/adventure-2.jpg',
        '/images/features/adventure/adventure-3.jpg',
        '/images/features/adventure/adventure-4.jpg',
      ]
    },
    {
      id: 'nature',
      icon: '🌳',
      title: 'Nature Immersion',
      description: 'Surrounded by lush forests and cool air, reconnect with nature and find your calm.',
      color: 'secondary',
      images: [
        '/images/accommodation/rest_house/rest_house_1.jpeg',
        '/images/accommodation/native_style_room/native_style_room_1.jpeg',
        '/images/accommodation/screen_cottages/screen_cottages_1.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_1.jpeg',
      ]
    },
    {
      id: 'luxury',
      icon: '🏨',
      title: 'Luxury Comfort',
      description: 'From cozy cottages to spacious rest houses, enjoy modern amenities and thoughtful service.',
      color: 'accent',
      images: [
        '/images/accommodation/blue_room/blue_room_1.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_1.jpeg',
        '/images/accommodation/yellow_terrace/yellow_terrace_1.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_1.jpeg',
      ]
    }
  ];

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentGallery, setCurrentGallery] = useState<{ name: string, images: string[] }>({ name: '', images: [] });
  const [photoIndex, setPhotoIndex] = useState(0);

  const openGallery = (name: string, images: string[], startIndex: number = 0) => {
    setCurrentGallery({ name, images });
    setPhotoIndex(startIndex);
    setLightboxOpen(true);
  };

  const featuredRooms = [
    {
      name: 'Blue Room (AC)',
      description: 'Modern and cool standard room with full air conditioning for a perfect rest.',
      price: 1350,
      images: [
        '/images/accommodation/blue_room/blue_room_1.jpeg',
        '/images/accommodation/blue_room/blue_room_2.jpeg',
        '/images/accommodation/blue_room/blue_room_3.jpeg',
        '/images/accommodation/blue_room/blue_room_4.jpeg',
        '/images/accommodation/blue_room/blue_room_5.jpeg',
        '/images/accommodation/blue_room/blue_room_6.jpeg',
      ]
    },
    {
      name: 'Dorm Style Cottage',
      description: 'Perfect for large groups or families. Traditional style with massive space.',
      price: 5000,
      images: [
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_1.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_2.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_3.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_4.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_5.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_6.jpeg',
      ]
    },
    {
      name: 'Orange Terrace',
      description: 'Luxurious terrace room with stunning views and premium space for gatherings.',
      price: 4200,
      images: [
        '/images/accommodation/orange_terrace/orange_terrace_1.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_2.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_3.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_4.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_5.jpeg',
      ]
    }
  ];

  return (
    <>
      <Navigation />

      <Lightbox
        isOpen={lightboxOpen}
        images={currentGallery.images}
        currentIndex={photoIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentGallery.images.length - 1))}
        onNext={() => setPhotoIndex((prev) => (prev < currentGallery.images.length - 1 ? prev + 1 : 0))}
        title={currentGallery.name}
      />

      <Notification
        isVisible={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification(prev => ({ ...prev, show: false }))}
      />

      {/* Hero Section */}
      <section className="relative hero-gradient">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/10 via-white to-secondary/10 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900"></div>
        <div className="container mx-auto px-4 relative z-10 pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <p className="text-xs md:text-sm font-semibold tracking-[0.25em] uppercase text-primary mb-4">
                Nature · Adventure · Escape
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-accent mb-4 leading-tight dark:text-white">
                Welcome to AlFarm Resort & Adventure Park
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-6 max-w-xl dark:text-white">
                Unplug from the city and wake up to cool breeze, pine trees, and all-day activities for the whole family.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <PrimaryButton href="/rooms" className="text-base md:text-lg px-8 py-3 inline-block text-center">
                  Explore Accommodations
                </PrimaryButton>
                <Link href="/activities" className="btn-secondary text-base md:text-lg px-8 py-3 inline-block text-center">
                  Discover Activities
                </Link>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm text-gray-500 dark:text-white">
                <div className="flex -space-x-2">
                  <span className="h-8 w-8 rounded-full bg-primary/20 border border-white"></span>
                  <span className="h-8 w-8 rounded-full bg-secondary/30 border border-white"></span>
                  <span className="h-8 w-8 rounded-full bg-accent/20 border border-white"></span>
                </div>
                <p>Perfect for barkadas, families, and team outings all year round.</p>
              </div>
            </div>

            <div>
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 p-6 md:p-8 dark:bg-slate-900/90 dark:border-slate-700 relative z-20">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-accent dark:text-white">Start your stay</h2>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-white">
                      Best rates guaranteed
                    </p>
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full dark:text-primary-100 dark:bg-primary/20">
                    Book Online
                  </span>
                </div>

                {/* Booking Widget */}
                <TagToggle
                  options={['Day-use', 'Overnight']}
                  active={bookingType}
                  onChange={(val) => {
                    setBookingType(val);
                    if (val === 'Overnight' && checkInDate && (!checkOutDate || checkOutDate <= checkInDate)) {
                      const nextDay = new Date(checkInDate);
                      nextDay.setDate(nextDay.getDate() + 1);
                      setCheckOutDate(nextDay.toISOString().split('T')[0]);
                    }
                  }}
                  className="mb-6"
                />

                <div className={`grid grid-cols-1 ${bookingType === 'Overnight' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4 mb-6`}>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-white">
                      {bookingType === 'Overnight' ? 'Check-in' : 'Date'}
                    </label>
                    <div className="mt-1">
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={checkInDate}
                        onChange={(e) => {
                          setCheckInDate(e.target.value);
                          // Auto-set check-out to next day if not set or invalid
                          if (bookingType === 'Overnight' && (!checkOutDate || checkOutDate <= e.target.value)) {
                            const nextDay = new Date(e.target.value);
                            nextDay.setDate(nextDay.getDate() + 1);
                            setCheckOutDate(nextDay.toISOString().split('T')[0]);
                          }
                        }}
                        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {bookingType === 'Overnight' && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-white">Check-out</label>
                      <div className="mt-1">
                        <input
                          type="date"
                          min={checkInDate ? new Date(new Date(checkInDate).getTime() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-primary focus:border-transparent outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="relative" ref={guestMenuRef}>
                    <label className="text-xs font-semibold text-gray-500 dark:text-white">Guests</label>
                    <button
                      type="button"
                      onClick={() => setShowGuestMenu(!showGuestMenu)}
                      className="w-full mt-1 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800 transition-colors"
                    >
                      <span>{adults + children} guests</span>
                      <span className="text-xs text-primary font-medium">Edit</span>
                    </button>

                    {/* Guest Menu Dropdown */}
                    {showGuestMenu && (
                      <div className="absolute top-full right-0 left-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-fadeIn dark:bg-slate-900 dark:border-slate-700">
                        <div className="space-y-4">
                          <CountSelector
                            label={`Adults (₱${adultFee})`}
                            value={adults}
                            min={1}
                            onChange={setAdults}
                            helperText="Ages 13+"
                          />
                          <CountSelector
                            label={`Children (₱${childFee})`}
                            value={children}
                            min={0}
                            onChange={setChildren}
                            helperText="Ages 0-12"
                          />
                          <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                            <div className="flex justify-between items-center text-sm font-semibold text-gray-700 dark:text-white mb-3">
                              <span>Entrance Fees:</span>
                              <span className="text-primary">₱{estimatedEntranceFee}</span>
                            </div>
                            <button
                              onClick={() => setShowGuestMenu(false)}
                              className="text-xs text-white bg-primary hover:bg-primary-600 w-full py-2 rounded-lg transition-colors"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Estimate Display */}
                {checkInDate && (
                  <div className="mb-4 p-3 bg-primary/5 rounded-lg border border-primary/10 flex justify-between items-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Estimated Entrance Fees:</span>
                    <span className="text-sm font-bold text-primary">₱{estimatedEntranceFee}</span>
                  </div>
                )}

                <button
                  onClick={handleSearch}
                  className="w-full bg-primary hover:bg-primary-600 text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-primary/30 active:scale-[0.98]"
                >
                  Check Availability
                </button>

                <p className="mt-3 text-[11px] text-center text-gray-400 dark:text-white">
                  {bookingType === 'Overnight' && checkInDate && checkOutDate && (
                    <span className="block text-primary font-medium mb-1">
                      {Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24))} night(s) stay
                    </span>
                  )}
                  Choose your dates and guest count to see available offers.
                </p>
              </div>

              <p className="mt-4 text-xs text-gray-500 text-center lg:text-right dark:text-white">
                No credit card needed to explore available dates.
              </p>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden md:flex flex-col items-center text-gray-400 dark:text-white">
          <span className="text-[10px] tracking-[0.35em] uppercase mb-1">Scroll</span>
          <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>


      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <SectionHeader
            title="Why Choose AlFarm?"
            subtitle="Experience the best of both worlds"
          />

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <button
                key={feature.id}
                onClick={() => setSelectedFeature(feature.id)}
                className={`card text-center border hover:border-${feature.color}/30 dark:border-slate-700 dark:hover:border-${feature.color}/50 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${feature.color === 'primary' ? 'border-gray-100' : feature.color === 'secondary' ? 'border-gray-100' : 'border-gray-100'
                  }`}
              >
                <div className={`mx-auto mb-4 h-16 w-16 rounded-2xl bg-${feature.color}/10 flex items-center justify-center text-3xl`}>
                  <span>{feature.icon}</span>
                </div>
                <h3 className="text-2xl font-bold text-accent mb-2 dark:text-white">{feature.title}</h3>
                <p className="text-sm text-gray-600 dark:text-white mb-3">
                  {feature.description}
                </p>
                <span className="text-xs text-primary font-semibold">Click to view gallery →</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setSelectedFeature(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedFeature(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-12 w-12 rounded-xl bg-${features.find(f => f.id === selectedFeature)?.color}/10 flex items-center justify-center text-2xl`}>
                  <span>{features.find(f => f.id === selectedFeature)?.icon}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-accent dark:text-white">
                  {features.find(f => f.id === selectedFeature)?.title}
                </h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                {features.find(f => f.id === selectedFeature)?.description}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {features.find(f => f.id === selectedFeature)?.images.map((imagePath, idx) => (
                <div key={idx} className="aspect-video rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 relative">
                  <Image
                    src={imagePath}
                    alt={`${features.find(f => f.id === selectedFeature)?.title} - Image ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onError={(e) => {
                      // Fallback to placeholder if image doesn't exist
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="absolute inset-0 flex items-center justify-center">
                            <div class="text-center">
                              <div class="text-4xl mb-2">${features.find(f => f.id === selectedFeature)?.icon}</div>
                              <p class="text-sm text-gray-500 dark:text-gray-400">Image Placeholder ${idx + 1}</p>
                              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Add image to: ${imagePath}</p>
                            </div>
                          </div>
                        `;
                      }
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setSelectedFeature(null)}
                className="px-6 py-3 bg-primary hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors"
              >
                Close Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accommodations Preview */}
      <section className="py-20 bg-gray-50 dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <SectionHeader
            title="Our Accommodations"
            subtitle="Find your perfect retreat"
          />

          <div className="grid md:grid-cols-3 gap-8">
            {featuredRooms.map((room, idx) => (
              <div key={idx} className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl border border-gray-100 transition-all duration-300 dark:bg-accent-dark dark:border-slate-700">
                <div
                  className="relative h-56 w-full overflow-hidden cursor-pointer"
                  onClick={() => openGallery(room.name, room.images, 0)}
                >
                  <Image
                    src={room.images[0]}
                    alt={room.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={idx < 3}
                    quality={75}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/90 text-primary px-4 py-2 rounded-lg font-bold flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>View Gallery</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 flex flex-col">
                  <h3 className="text-2xl font-bold text-accent mb-1 dark:text-white">{room.name}</h3>
                  <p className="text-sm text-gray-600 mb-4 dark:text-white/80 line-clamp-2 h-10">
                    {room.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <p className="text-2xl font-bold text-primary">
                      ₱{room.price}
                      <span className="text-sm text-gray-500 ml-1">/ night</span>
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => openGallery(room.name, room.images, 0)}
                      className="btn-outline py-2 text-xs text-center"
                    >
                      Gallery
                    </button>
                    <Link href="/rooms" className="btn-primary py-2 text-xs text-center">
                      Details
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <PrimaryButton href="/rooms" className="text-lg px-10 py-4 inline-block">
              View All Accommodations
            </PrimaryButton>
          </div>
        </div>
      </section>

      {/* Activities Preview */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <SectionHeader
            title="Adventure Awaits"
            subtitle="Exciting activities for everyone"
          />

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="text-center p-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-shadow dark:border-slate-700 dark:from-primary/20 dark:to-primary/40">
              <div className="text-4xl mb-3">🏇</div>
              <h4 className="text-lg font-semibold text-accent dark:text-white">Horse Back Riding</h4>
              <p className="mt-2 text-xs text-gray-600 dark:text-white">Ride through scenic trails and open meadows on well-trained horses.</p>
              <p className="mt-2 text-xs font-semibold text-primary">₱50 per 5 minutes</p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-secondary/5 to-secondary/10 hover:shadow-lg transition-shadow dark:border-slate-700 dark:from-secondary/20 dark:to-secondary/40">
              <div className="text-4xl mb-3">🔦</div>
              <h4 className="text-lg font-semibold text-accent dark:text-white">Cave Tour</h4>
              <p className="mt-2 text-xs text-gray-600 dark:text-white">Discover hidden wonders of ancient limestone caves with experienced guides.</p>
              <p className="mt-2 text-xs font-semibold text-primary">₱50 per person · Min 7 persons</p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/activities" className="btn-secondary text-lg inline-block">
              Explore All Activities
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 nature-gradient">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs md:text-sm font-semibold tracking-[0.3em] uppercase text-white/80 mb-3">
            Plan your getaway
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Ready for Your Adventure?
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Book your stay today and experience the perfect combination of nature, adventure, and comfort.
          </p>
          <Link
            href="/guest/login"
            className="bg-white text-primary hover:bg-gray-100 font-bold text-lg px-10 py-4 rounded-lg inline-block transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Book Your Stay Now
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
