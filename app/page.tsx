'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SectionHeader from '@/components/ui/SectionHeader';
import PrimaryButton from '@/components/ui/PrimaryButton';
import TagToggle from '@/components/ui/TagToggle';
import CountSelector from '@/components/ui/CountSelector';
import Notification, { NotificationType } from '@/components/ui/Notification';

export default function Home() {
  const router = useRouter();
  const [bookingType, setBookingType] = useState('Day-use');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [showGuestMenu, setShowGuestMenu] = useState(false);
  const guestMenuRef = useRef<HTMLDivElement>(null);
  
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: NotificationType;
  }>({ show: false, message: '', type: 'error' });

  // Constants for Entrance Fees (Should match DB/Offers)
  const FEES = {
    DAY: { ADULT: 60, CHILD: 30 },
    NIGHT: { ADULT: 70, CHILD: 35 }
  };

  // Calculate Entrance Fee Estimate
  const currentFees = bookingType === 'Day-use' ? FEES.DAY : FEES.NIGHT;
  const estimatedEntranceFee = (adults * currentFees.ADULT) + (children * currentFees.CHILD);

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
    
    const params = new URLSearchParams({
      type: bookingType === 'Day-use' ? 'day' : 'overnight',
      check_in: checkInDate,
      adults: adults.toString(),
      children: children.toString(),
    });

    if (bookingType === 'Overnight' && checkOutDate) {
      params.append('check_out', checkOutDate);
    }

    router.push(`/booking/results?${params.toString()}`);
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
                  onChange={setBookingType}
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
                            label={`Adults (₱${currentFees.ADULT})`}
                            value={adults}
                            min={1}
                            onChange={setAdults}
                            helperText="Ages 13+"
                          />
                          <CountSelector
                            label={`Children (₱${currentFees.CHILD})`}
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
            {/* Feature 1 */}
            <div className="card text-center border border-gray-100 hover:border-primary/30 dark:border-slate-700 dark:hover:border-primary/50">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                <span>🏔️</span>
              </div>
              <h3 className="text-2xl font-bold text-accent mb-2 dark:text-white">Adventure Activities</h3>
              <p className="text-sm text-gray-600 dark:text-white">
                Zip-lining, hiking trails, rock climbing, and more thrilling adventures across our expansive park.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card text-center border border-gray-100 hover:border-secondary/30 dark:border-slate-700 dark:hover:border-secondary/50">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-secondary/10 flex items-center justify-center text-3xl">
                <span>🌳</span>
              </div>
              <h3 className="text-2xl font-bold text-accent mb-2 dark:text-white">Nature Immersion</h3>
              <p className="text-sm text-gray-600 dark:text-white">
                Surrounded by lush forests and cool air, reconnect with nature and find your calm.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card text-center border border-gray-100 hover:border-primary/30 dark:border-slate-700 dark:hover:border-primary/50">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center text-3xl">
                <span>🏨</span>
              </div>
              <h3 className="text-2xl font-bold text-accent mb-2 dark:text-white">Luxury Comfort</h3>
              <p className="text-sm text-gray-600 dark:text-white">
                From cozy cabins to private villas, enjoy modern amenities and thoughtful service.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Accommodations Preview */}
      <section className="py-20 bg-gray-50 dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <SectionHeader
            title="Our Accommodations"
            subtitle="Find your perfect retreat"
          />

          <div className="grid md:grid-cols-3 gap-8">
            {/* Room Type 1 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl border border-gray-100 hover:border-primary/30 transition-all duration-300 dark:bg-accent-dark dark:border-slate-700 dark:hover:border-primary/50">
              <div className="h-48 bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
                <span className="text-5xl">🛏️</span>
              </div>
              <div className="p-6 flex flex-col h-full">
                <h3 className="text-2xl font-bold text-accent mb-1 dark:text-white">Standard Rooms</h3>
                <p className="text-sm text-gray-600 mb-4 dark:text-white">
                  Comfortable and cozy spaces, ideal for couples and small families.
                </p>
                <p className="text-2xl font-bold text-primary mb-4">
                  ₱1,500
                  <span className="text-sm text-gray-500 ml-1">/ night</span>
                </p>
                <Link href="/rooms" className="btn-outline w-full mt-auto block text-center">
                  View Details
                </Link>
              </div>
            </div>

            {/* Room Type 2 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl border border-gray-100 hover:border-secondary/30 transition-all duration-300 dark:bg-accent-dark dark:border-slate-700 dark:hover:border-secondary/50">
              <div className="h-48 bg-gradient-to-br from-secondary to-secondary-600 flex items-center justify-center">
                <span className="text-5xl">🏡</span>
              </div>
              <div className="p-6 flex flex-col h-full">
                <h3 className="text-2xl font-bold text-accent mb-1 dark:text-white">Deluxe Suites</h3>
                <p className="text-sm text-gray-600 mb-4 dark:text-white">
                  Spacious suites with great views and premium amenities.
                </p>
                <p className="text-2xl font-bold text-primary mb-4">
                  ₱4,000
                  <span className="text-sm text-gray-500 ml-1">/ night</span>
                </p>
                <Link href="/rooms" className="btn-outline w-full mt-auto block text-center">
                  View Details
                </Link>
              </div>
            </div>

            {/* Room Type 3 */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl border border-gray-100 hover:border-primary/30 transition-all duration-300 dark:bg-accent-dark dark:border-slate-700 dark:hover:border-primary/50">
              <div className="h-48 bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                <span className="text-5xl">🏰</span>
              </div>
              <div className="p-6 flex flex-col h-full">
                <h3 className="text-2xl font-bold text-accent mb-1 dark:text-white">Private Villas</h3>
                <p className="text-sm text-gray-600 mb-4 dark:text-white">
                  Exclusive villas with generous space and full privacy.
                </p>
                <p className="text-2xl font-bold text-primary mb-4">
                  ₱6,500
                  <span className="text-sm text-gray-500 ml-1">/ night</span>
                </p>
                <Link href="/rooms" className="btn-outline w-full mt-auto block text-center">
                  View Details
                </Link>
              </div>
            </div>
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

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-shadow dark:border-slate-700 dark:from-primary/20 dark:to-primary/40">
              <div className="text-4xl mb-3">🪂</div>
              <h4 className="text-lg font-semibold text-accent dark:text-white">Zip-Lining</h4>
              <p className="mt-2 text-xs text-gray-600 dark:text-white">Soar above the trees on our signature zip-line course.</p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-secondary/5 to-secondary/10 hover:shadow-lg transition-shadow dark:border-slate-700 dark:from-secondary/20 dark:to-secondary/40">
              <div className="text-4xl mb-3">🥾</div>
              <h4 className="text-lg font-semibold text-accent dark:text-white">Hiking Trails</h4>
              <p className="mt-2 text-xs text-gray-600 dark:text-white">Guided and self-paced hikes through scenic mountain paths.</p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-lg transition-shadow dark:border-slate-700 dark:from-primary/20 dark:to-primary/40">
              <div className="text-4xl mb-3">🧗</div>
              <h4 className="text-lg font-semibold text-accent dark:text-white">Rock Climbing</h4>
              <p className="mt-2 text-xs text-gray-600 dark:text-white">Challenge yourself on beginner to advanced climbing walls.</p>
            </div>
            <div className="text-center p-6 rounded-2xl border border-gray-100 bg-gradient-to-br from-secondary/5 to-secondary/10 hover:shadow-lg transition-shadow dark:border-slate-700 dark:from-secondary/20 dark:to-secondary/40">
              <div className="text-4xl mb-3">🦌</div>
              <h4 className="text-lg font-semibold text-accent dark:text-white">Wildlife Tours</h4>
              <p className="mt-2 text-xs text-gray-600 dark:text-white">Discover local wildlife with our guided eco-tours.</p>
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
